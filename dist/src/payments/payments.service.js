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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const ORDER_TTL_MS = 30 * 60 * 1000;
let PaymentsService = class PaymentsService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async createOrder(userId, packageId) {
        const pkg = await this.prisma.package.findFirst({
            where: {
                id: packageId,
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
            },
        });
        if (!pkg)
            throw new common_1.NotFoundException('Gói đăng ký không tồn tại');
        const now = new Date();
        await this.prisma.paymentOrder.updateMany({
            where: {
                userId,
                status: client_1.PaymentStatus.PENDING,
                expiresAt: { lte: now },
            },
            data: { status: client_1.PaymentStatus.EXPIRED },
        });
        let order = await this.prisma.paymentOrder.findFirst({
            where: {
                userId,
                packageId,
                amount: pkg.price,
                status: client_1.PaymentStatus.PENDING,
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!order) {
            order = await this.createOrderWithUniqueCode(userId, packageId, pkg.price);
        }
        return this.mapOrder(order, pkg);
    }
    async getOrder(userId, orderId) {
        const order = await this.prisma.paymentOrder.findFirst({
            where: { id: orderId, userId },
            include: { package: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Đơn thanh toán không tồn tại');
        if (order.status === client_1.PaymentStatus.PENDING &&
            order.expiresAt <= new Date()) {
            const expired = await this.prisma.paymentOrder.update({
                where: { id: order.id },
                data: { status: client_1.PaymentStatus.EXPIRED },
                include: { package: true },
            });
            return this.mapOrder(expired, expired.package);
        }
        return this.mapOrder(order, order.package);
    }
    verifyWebhook(authorization, signature, timestamp, rawBody) {
        const hmacSecret = this.config.get('SEPAY_WEBHOOK_SECRET')?.trim();
        if (hmacSecret) {
            if (!signature || !timestamp || !rawBody) {
                throw new common_1.UnauthorizedException('Thiếu chữ ký webhook SePay');
            }
            const timestampNumber = Number(timestamp);
            if (!Number.isFinite(timestampNumber) ||
                Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
                throw new common_1.UnauthorizedException('Webhook SePay đã hết hạn');
            }
            const expected = 'sha256=' +
                (0, crypto_1.createHmac)('sha256', hmacSecret)
                    .update(`${timestamp}.${rawBody.toString('utf8')}`)
                    .digest('hex');
            if (!this.safeEqual(signature, expected)) {
                throw new common_1.UnauthorizedException('Chữ ký webhook SePay không hợp lệ');
            }
            return;
        }
        const apiKey = this.config.get('SEPAY_WEBHOOK_API_KEY')?.trim();
        if (!apiKey) {
            throw new common_1.UnauthorizedException('Server chưa cấu hình xác thực webhook SePay');
        }
        if (!this.safeEqual(authorization ?? '', `Apikey ${apiKey}`)) {
            throw new common_1.UnauthorizedException('API key webhook SePay không hợp lệ');
        }
    }
    async processWebhook(dto) {
        const sepayTransactionId = String(dto.id);
        const existing = await this.prisma.paymentTransaction.findUnique({
            where: { sepayTransactionId },
        });
        if (existing) {
            return { success: true, duplicate: true };
        }
        try {
            return await this.prisma.$transaction(async (tx) => {
                const event = await tx.paymentTransaction.create({
                    data: {
                        sepayTransactionId,
                        payload: { ...dto },
                    },
                });
                const reject = async (reason, orderId) => {
                    await tx.paymentTransaction.update({
                        where: { id: event.id },
                        data: {
                            orderId,
                            status: client_1.PaymentEventStatus.REJECTED,
                            reason,
                            processedAt: new Date(),
                        },
                    });
                    return { success: true, matched: false, reason };
                };
                if (dto.transferType !== 'in') {
                    return reject('Giao dịch không phải tiền vào');
                }
                const expectedAccount = this.config
                    .get('SEPAY_ACCOUNT_NUMBER', '12897891')
                    .replace(/\s+/g, '');
                if (dto.accountNumber.replace(/\s+/g, '') !== expectedAccount) {
                    return reject('Sai tài khoản nhận');
                }
                const paymentCode = this.extractPaymentCode(dto);
                if (!paymentCode) {
                    return reject('Không tìm thấy mã thanh toán');
                }
                const order = await tx.paymentOrder.findUnique({
                    where: { paymentCode },
                    include: { package: true },
                });
                if (!order)
                    return reject('Mã thanh toán không tồn tại');
                if (order.status === client_1.PaymentStatus.PAID) {
                    await tx.paymentTransaction.update({
                        where: { id: event.id },
                        data: {
                            orderId: order.id,
                            status: client_1.PaymentEventStatus.COMPLETED,
                            reason: 'Đơn đã được thanh toán trước đó',
                            processedAt: new Date(),
                        },
                    });
                    return { success: true, matched: true, duplicateOrder: true };
                }
                if (order.status !== client_1.PaymentStatus.PENDING ||
                    order.expiresAt <= new Date()) {
                    if (order.status === client_1.PaymentStatus.PENDING) {
                        await tx.paymentOrder.update({
                            where: { id: order.id },
                            data: { status: client_1.PaymentStatus.EXPIRED },
                        });
                    }
                    return reject('Đơn thanh toán đã hết hạn', order.id);
                }
                if (dto.transferAmount !== order.amount) {
                    return reject(`Sai số tiền: nhận ${dto.transferAmount}, cần ${order.amount}`, order.id);
                }
                const user = await tx.user.findUnique({
                    where: { id: order.userId },
                    select: { premiumExpiresAt: true },
                });
                if (!user)
                    return reject('Tài khoản người dùng không tồn tại', order.id);
                const premiumExpiresAt = this.calculatePremiumExpiry(user.premiumExpiresAt, order.package.durationUnit, order.package.days, order.package.months);
                const paidAt = new Date();
                await tx.paymentOrder.update({
                    where: { id: order.id },
                    data: {
                        status: client_1.PaymentStatus.PAID,
                        paidAmount: dto.transferAmount,
                        paidAt,
                    },
                });
                await tx.user.update({
                    where: { id: order.userId },
                    data: {
                        isPremium: true,
                        packageId: order.packageId,
                        premiumExpiresAt,
                    },
                });
                await tx.paymentTransaction.update({
                    where: { id: event.id },
                    data: {
                        orderId: order.id,
                        status: client_1.PaymentEventStatus.COMPLETED,
                        processedAt: paidAt,
                    },
                });
                return { success: true, matched: true };
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                return { success: true, duplicate: true };
            }
            throw error;
        }
    }
    async createOrderWithUniqueCode(userId, packageId, amount) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                return await this.prisma.paymentOrder.create({
                    data: {
                        userId,
                        packageId,
                        amount,
                        paymentCode: `SHD${(0, crypto_1.randomBytes)(5).toString('hex').toUpperCase()}`,
                        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
                    },
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002') {
                    continue;
                }
                throw error;
            }
        }
        throw new common_1.BadRequestException('Không thể tạo mã thanh toán, hãy thử lại');
    }
    mapOrder(order, pkg) {
        const bank = this.config.get('SEPAY_BANK', 'ACB');
        const accountNumber = this.config.get('SEPAY_ACCOUNT_NUMBER', '12897891');
        const accountHolder = this.config.get('SEPAY_ACCOUNT_HOLDER', 'LE CHAU KIET');
        const qr = new URL('https://vietqr.app/img');
        qr.searchParams.set('bank', bank);
        qr.searchParams.set('acc', accountNumber);
        qr.searchParams.set('amount', String(order.amount));
        qr.searchParams.set('addInfo', order.paymentCode);
        qr.searchParams.set('template', 'compact');
        qr.searchParams.set('showinfo', 'true');
        qr.searchParams.set('holder', accountHolder);
        return {
            id: order.id,
            paymentCode: order.paymentCode,
            amount: order.amount,
            status: order.status,
            expiresAt: order.expiresAt,
            paidAt: order.paidAt,
            package: {
                id: pkg.id,
                name: pkg.name,
                durationUnit: pkg.durationUnit,
                days: pkg.days,
                months: pkg.months,
            },
            bank: { bank, accountNumber, accountHolder },
            qrUrl: qr.toString(),
        };
    }
    extractPaymentCode(dto) {
        const configuredPrefix = this.config
            .get('SEPAY_PAYMENT_PREFIX', 'SHD')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
        const pattern = new RegExp(`${configuredPrefix}[A-Z0-9]{10}`, 'i');
        const source = `${dto.code ?? ''} ${dto.content ?? ''}`;
        return source.match(pattern)?.[0]?.toUpperCase() ?? null;
    }
    calculatePremiumExpiry(currentExpiry, unit, days, months) {
        const now = new Date();
        const result = currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
        if (unit === client_1.DurationUnit.DAY) {
            result.setDate(result.getDate() + Math.max(days, 1));
        }
        else {
            result.setMonth(result.getMonth() + Math.max(months, 1));
        }
        return result;
    }
    safeEqual(actual, expected) {
        const actualBuffer = Buffer.from(actual);
        const expectedBuffer = Buffer.from(expected);
        return (actualBuffer.length === expectedBuffer.length &&
            (0, crypto_1.timingSafeEqual)(actualBuffer, expectedBuffer));
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map