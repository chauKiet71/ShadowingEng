import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';
import * as bcrypt from 'bcrypt';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

interface UploadedAvatarFile {
  buffer: Buffer;
  originalname: string;
}

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isPremium: true,
  avatarUrl: true,
  xp: true,
  level: true,
  streakDays: true,
  status: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName.trim(),
        password: hashed,
      },
      select: userSelect,
    });

    return { user: this.sanitizeUser(user), accessToken: this.signToken(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { ...userSelect, password: true },
    });

    if (!user?.password) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActivity: new Date() },
    });

    const { password: _, ...safeUser } = user;
    return {
      user: this.sanitizeUser(safeUser),
      accessToken: this.signToken(safeUser),
    };
  }

  async loginWithGoogle(profile: Profile) {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const fullName =
      profile.displayName?.trim() ||
      profile.name?.givenName ||
      email?.split('@')[0] ||
      'Người dùng';
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    if (!email) {
      throw new BadRequestException(
        'Google không cung cấp email. Vui lòng dùng tài khoản Google khác.',
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { googleId },
      select: userSelect,
    });

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
        select: userSelect,
      });

      if (existingByEmail) {
        if (existingByEmail.status === UserStatus.LOCKED) {
          throw new ForbiddenException(
            'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.',
          );
        }

        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            avatarUrl: existingByEmail.avatarUrl ?? avatarUrl,
            lastActivity: new Date(),
          },
          select: userSelect,
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            fullName,
            googleId,
            avatarUrl,
          },
          select: userSelect,
        });
      }
    } else {
      if (user.status === UserStatus.LOCKED) {
        throw new ForbiddenException(
          'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.',
        );
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastActivity: new Date(),
          avatarUrl: user.avatarUrl ?? avatarUrl,
        },
        select: userSelect,
      });
    }

    return {
      user: this.sanitizeUser(user),
      accessToken: this.signToken(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user || user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
    return this.sanitizeUser(user);
  }

  async updateAvatar(userId: string, file: UploadedAvatarFile) {
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    if (!allowed.has(ext)) {
      throw new BadRequestException('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP');
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${userId}${ext}`;
    await writeFile(join(uploadDir, filename), file.buffer);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: `/uploads/avatars/${filename}` },
      select: userSelect,
    });

    return this.sanitizeUser(user);
  }

  private signToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private sanitizeUser<T extends { status?: UserStatus }>(user: T) {
    const { status: _, ...rest } = user;
    return rest;
  }
}
