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
exports.AdminTransactionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function startOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
let AdminTransactionsService = class AdminTransactionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats() {
        const now = new Date();
        const today = startOfDay(now);
        const monthStart = startOfMonth(now);
        const [pending, paidTodayAgg, revenueMonthAgg, expired7d, paidTotal,] = await Promise.all([
            this.prisma.paymentOrder.count({
                where: { status: client_1.PaymentStatus.PENDING },
            }),
            this.prisma.paymentOrder.aggregate({
                where: { status: client_1.PaymentStatus.PAID, paidAt: { gte: today } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.paymentOrder.aggregate({
                where: { status: client_1.PaymentStatus.PAID, paidAt: { gte: monthStart } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.paymentOrder.count({
                where: {
                    status: { in: [client_1.PaymentStatus.EXPIRED, client_1.PaymentStatus.CANCELLED] },
                    updatedAt: {
                        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            this.prisma.paymentOrder.count({
                where: { status: client_1.PaymentStatus.PAID },
            }),
        ]);
        return {
            pending,
            paidToday: paidTodayAgg._count,
            revenueToday: paidTodayAgg._sum.amount ?? 0,
            paidMonth: revenueMonthAgg._count,
            revenueMonth: revenueMonthAgg._sum.amount ?? 0,
            expiredOrCancelled7d: expired7d,
            paidTotal,
        };
    }
    async list(params) {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const where = {};
        if (params.status) {
            where.status = params.status;
        }
        const search = params.search?.trim();
        if (search) {
            where.OR = [
                { paymentCode: { contains: search, mode: 'insensitive' } },
                { user: { fullName: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { package: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [orders, total] = await Promise.all([
            this.prisma.paymentOrder.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    paymentCode: true,
                    amount: true,
                    paidAmount: true,
                    status: true,
                    paidAt: true,
                    expiresAt: true,
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    package: {
                        select: { id: true, name: true },
                    },
                    transactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 3,
                        select: {
                            id: true,
                            sepayTransactionId: true,
                            status: true,
                            reason: true,
                            createdAt: true,
                            processedAt: true,
                        },
                    },
                },
            }),
            this.prisma.paymentOrder.count({ where }),
        ]);
        return {
            orders: orders.map((order) => ({
                id: order.id,
                paymentCode: order.paymentCode,
                amount: order.amount,
                paidAmount: order.paidAmount,
                status: order.status,
                paidAt: order.paidAt?.toISOString() ?? null,
                expiresAt: order.expiresAt.toISOString(),
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString(),
                user: order.user,
                package: order.package,
                events: order.transactions.map((tx) => ({
                    id: tx.id,
                    sepayTransactionId: tx.sepayTransactionId,
                    status: tx.status,
                    reason: tx.reason,
                    createdAt: tx.createdAt.toISOString(),
                    processedAt: tx.processedAt?.toISOString() ?? null,
                })),
            })),
            total,
            page,
            limit,
        };
    }
};
exports.AdminTransactionsService = AdminTransactionsService;
exports.AdminTransactionsService = AdminTransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminTransactionsService);
//# sourceMappingURL=admin-transactions.service.js.map