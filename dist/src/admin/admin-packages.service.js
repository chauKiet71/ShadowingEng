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
exports.AdminPackagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const guest_identity_service_1 = require("../auth/guest-identity.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminPackagesService = class AdminPackagesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listSubscribers(packageId) {
        const pkg = await this.prisma.package.findUnique({
            where: { id: packageId },
            select: { id: true, name: true },
        });
        if (!pkg)
            throw new common_1.NotFoundException('Gói đăng ký không tồn tại');
        const users = await this.prisma.user.findMany({
            where: {
                packageId,
                NOT: { email: { endsWith: guest_identity_service_1.GUEST_EMAIL_SUFFIX } },
            },
            orderBy: { premiumExpiresAt: 'asc' },
            select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                isPremium: true,
                premiumExpiresAt: true,
                createdAt: true,
                package: { select: { id: true, name: true } },
                paymentOrders: {
                    where: {
                        packageId,
                        status: client_1.PaymentStatus.PAID,
                    },
                    orderBy: { paidAt: 'desc' },
                    take: 1,
                    select: {
                        paidAt: true,
                        createdAt: true,
                    },
                },
            },
        });
        return {
            package: pkg,
            total: users.length,
            subscribers: users.map((user) => {
                const latestPaid = user.paymentOrders[0];
                return {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    avatarUrl: user.avatarUrl,
                    isPremium: user.isPremium,
                    packageName: user.package?.name ?? pkg.name,
                    subscribedAt: latestPaid?.paidAt?.toISOString() ??
                        latestPaid?.createdAt?.toISOString() ??
                        null,
                    expiresAt: user.premiumExpiresAt?.toISOString() ?? null,
                };
            }),
        };
    }
};
exports.AdminPackagesService = AdminPackagesService;
exports.AdminPackagesService = AdminPackagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminPackagesService);
//# sourceMappingURL=admin-packages.service.js.map