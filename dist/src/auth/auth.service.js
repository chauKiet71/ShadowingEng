"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const prisma_service_1 = require("../prisma/prisma.service");
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
};
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing)
            throw new common_1.ConflictException('Email đã được sử dụng');
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
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            select: { ...userSelect, password: true },
        });
        if (!user?.password) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        if (user.status === client_1.UserStatus.LOCKED) {
            throw new common_1.ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
        }
        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
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
    async loginWithGoogle(profile) {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const fullName = profile.displayName?.trim() ||
            profile.name?.givenName ||
            email?.split('@')[0] ||
            'Người dùng';
        const avatarUrl = profile.photos?.[0]?.value ?? null;
        if (!email) {
            throw new common_1.BadRequestException('Google không cung cấp email. Vui lòng dùng tài khoản Google khác.');
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
                if (existingByEmail.status === client_1.UserStatus.LOCKED) {
                    throw new common_1.ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
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
            }
            else {
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
        }
        else {
            if (user.status === client_1.UserStatus.LOCKED) {
                throw new common_1.ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
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
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: userSelect,
        });
        if (!user || user.status === client_1.UserStatus.LOCKED) {
            throw new common_1.UnauthorizedException('Phiên đăng nhập không hợp lệ');
        }
        return this.sanitizeUser(user);
    }
    async updateAvatar(userId, file) {
        const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
        const ext = (0, path_1.extname)(file.originalname).toLowerCase() || '.jpg';
        if (!allowed.has(ext)) {
            throw new common_1.BadRequestException('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP');
        }
        const uploadDir = (0, path_1.join)(process.cwd(), 'public', 'uploads', 'avatars');
        await (0, promises_1.mkdir)(uploadDir, { recursive: true });
        const filename = `${userId}${ext}`;
        await (0, promises_1.writeFile)((0, path_1.join)(uploadDir, filename), file.buffer);
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: `/uploads/avatars/${filename}` },
            select: userSelect,
        });
        return this.sanitizeUser(user);
    }
    signToken(user) {
        return this.jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
    }
    sanitizeUser(user) {
        const { status: _, ...rest } = user;
        return rest;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map