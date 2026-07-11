import { Injectable, NotFoundException } from '@nestjs/common';
import { DurationUnit, PackageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PackagePayload {
  name: string;
  description?: string;
  price: number;
  duration: string;
  durationUnit?: DurationUnit;
  days?: number;
  months?: number;
  monthlyPrice?: number;
  originalPrice?: number | null;
  badge?: string | null;
  sortOrder?: number;
  icon?: string;
  status?: PackageStatus;
  isVisible?: boolean;
}

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  private mapPackage(pkg: {
    _count: { users: number };
    [key: string]: unknown;
  }) {
    const { _count, ...rest } = pkg;
    return { ...rest, userCount: _count.users };
  }

  private resolveUnitPrice(
    price: number,
    durationUnit: DurationUnit,
    days: number,
    months: number,
    monthlyPrice?: number,
  ) {
    if (monthlyPrice !== undefined) return monthlyPrice;
    if (durationUnit === DurationUnit.DAY && days > 0) {
      return Math.round(price / days);
    }
    if (months > 0) return Math.round(price / months);
    return price;
  }

  async findAll(params?: { status?: PackageStatus; visible?: boolean }) {
    const where: Record<string, unknown> = {};
    if (params?.status) where.status = params.status;
    if (params?.visible !== undefined) where.isVisible = params.visible;

    const packages = await this.prisma.package.findMany({
      where,
      include: { _count: { select: { users: true } } },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });

    return packages.map((pkg) => this.mapPackage(pkg));
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!pkg) throw new NotFoundException('Gói không tồn tại');
    return this.mapPackage(pkg);
  }

  async create(data: PackagePayload) {
    const durationUnit = data.durationUnit ?? DurationUnit.MONTH;
    const days = durationUnit === DurationUnit.DAY ? (data.days ?? 1) : 0;
    const months =
      durationUnit === DurationUnit.MONTH ? (data.months ?? 1) : 0;
    const monthlyPrice = this.resolveUnitPrice(
      data.price,
      durationUnit,
      days,
      months,
      data.monthlyPrice,
    );

    return this.prisma.package.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        durationUnit,
        days,
        months,
        monthlyPrice,
        originalPrice: data.originalPrice ?? null,
        badge: data.badge ?? null,
        sortOrder: data.sortOrder ?? 0,
        icon: data.icon ?? 'crown',
        status: data.status ?? PackageStatus.ACTIVE,
        isVisible: data.isVisible ?? true,
      },
    });
  }

  async update(id: string, data: Partial<PackagePayload>) {
    const existing = await this.prisma.package.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Gói không tồn tại');

    const durationUnit = data.durationUnit ?? existing.durationUnit;
    const price = data.price ?? existing.price;
    const days =
      durationUnit === DurationUnit.DAY
        ? (data.days ?? existing.days ?? 1)
        : 0;
    const months =
      durationUnit === DurationUnit.MONTH
        ? (data.months ?? existing.months ?? 1)
        : 0;
    const monthlyPrice = this.resolveUnitPrice(
      price,
      durationUnit,
      days,
      months,
      data.monthlyPrice ?? existing.monthlyPrice,
    );

    return this.prisma.package.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        durationUnit,
        days,
        months,
        monthlyPrice,
        originalPrice:
          data.originalPrice === undefined ? undefined : data.originalPrice,
        badge: data.badge === undefined ? undefined : data.badge,
        sortOrder: data.sortOrder,
        icon: data.icon,
        status: data.status,
        isVisible: data.isVisible,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.package.delete({ where: { id } });
  }
}
