"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let PackagesService = class PackagesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapPackage(pkg) {
        const { _count, ...rest } = pkg;
        return { ...rest, userCount: _count.users };
    }
    resolveUnitPrice(price, durationUnit, days, months, monthlyPrice) {
        if (monthlyPrice !== undefined)
            return monthlyPrice;
        if (durationUnit === client_1.DurationUnit.DAY && days > 0) {
            return Math.round(price / days);
        }
        if (months > 0)
            return Math.round(price / months);
        return price;
    }
    async findAll(params) {
        const where = {};
        if (params?.status)
            where.status = params.status;
        if (params?.visible !== undefined)
            where.isVisible = params.visible;
        const packages = await this.prisma.package.findMany({
            where,
            include: { _count: { select: { users: true } } },
            orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        });
        return packages.map((pkg) => this.mapPackage(pkg));
    }
    async findOne(id) {
        const pkg = await this.prisma.package.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });
        if (!pkg)
            throw new common_1.NotFoundException('Gói không tồn tại');
        return this.mapPackage(pkg);
    }
    async create(data) {
        const durationUnit = data.durationUnit ?? client_1.DurationUnit.MONTH;
        const days = durationUnit === client_1.DurationUnit.DAY ? (data.days ?? 1) : 0;
        const months = durationUnit === client_1.DurationUnit.MONTH ? (data.months ?? 1) : 0;
        const monthlyPrice = this.resolveUnitPrice(data.price, durationUnit, days, months, data.monthlyPrice);
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
                status: data.status ?? client_1.PackageStatus.ACTIVE,
                isVisible: data.isVisible ?? true,
            },
        });
    }
    async update(id, data) {
        const existing = await this.prisma.package.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Gói không tồn tại');
        const durationUnit = data.durationUnit ?? existing.durationUnit;
        const price = data.price ?? existing.price;
        const days = durationUnit === client_1.DurationUnit.DAY
            ? (data.days ?? existing.days ?? 1)
            : 0;
        const months = durationUnit === client_1.DurationUnit.MONTH
            ? (data.months ?? existing.months ?? 1)
            : 0;
        const monthlyPrice = this.resolveUnitPrice(price, durationUnit, days, months, data.monthlyPrice ?? existing.monthlyPrice);
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
                originalPrice: data.originalPrice === undefined ? undefined : data.originalPrice,
                badge: data.badge === undefined ? undefined : data.badge,
                sortOrder: data.sortOrder,
                icon: data.icon,
                status: data.status,
                isVisible: data.isVisible,
            },
        });
    }
    async remove(id) {
        return this.prisma.package.delete({ where: { id } });
    }
};
exports.PackagesService = PackagesService;
exports.PackagesService = PackagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PackagesService);
//# sourceMappingURL=packages.service.js.map