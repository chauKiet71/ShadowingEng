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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats() {
        const [total, newUsers, proUsers, activeUsers] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.user.count({ where: { isPremium: true } }),
            this.prisma.user.count({ where: { status: client_1.UserStatus.ACTIVE } }),
        ]);
        return { total, newUsers, proUsers, activeUsers };
    }
    async findAll(params) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const where = {};
        if (params.status)
            where.status = params.status;
        if (params.isPremium !== undefined)
            where.isPremium = params.isPremium;
        if (params.search) {
            where.OR = [
                { fullName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                    status: true,
                    isPremium: true,
                    package: { select: { name: true } },
                    createdAt: true,
                    lastActivity: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { users, total, page, limit };
    }
    async getProfile(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                xp: true,
                level: true,
                streakDays: true,
                isPremium: true,
                package: true,
                createdAt: true,
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map