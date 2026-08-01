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
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const guest_identity_service_1 = require("../auth/guest-identity.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminUsersService = class AdminUsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updatePremium(userId, body) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: userId,
                NOT: { email: { endsWith: guest_identity_service_1.GUEST_EMAIL_SUFFIX } },
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                isPremium: true,
                premiumExpiresAt: true,
                packageId: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Người dùng không tồn tại');
        let premiumExpiresAt = undefined;
        if (body.premiumExpiresAt !== undefined) {
            if (body.premiumExpiresAt === null || body.premiumExpiresAt === '') {
                premiumExpiresAt = null;
            }
            else {
                const parsed = new Date(body.premiumExpiresAt);
                if (Number.isNaN(parsed.getTime())) {
                    throw new common_1.BadRequestException('Ngày hết hạn không hợp lệ');
                }
                premiumExpiresAt = parsed;
            }
        }
        let packageId = undefined;
        if (body.packageId !== undefined) {
            if (body.packageId === null || body.packageId === '') {
                packageId = null;
            }
            else {
                const pkg = await this.prisma.package.findUnique({
                    where: { id: body.packageId },
                    select: { id: true },
                });
                if (!pkg)
                    throw new common_1.BadRequestException('Gói đăng ký không tồn tại');
                packageId = pkg.id;
            }
        }
        let isPremium = body.isPremium;
        if (isPremium === undefined && premiumExpiresAt !== undefined) {
            if (premiumExpiresAt === null) {
                isPremium = true;
            }
            else {
                isPremium = premiumExpiresAt > new Date();
            }
        }
        if (isPremium === undefined && packageId !== undefined) {
            isPremium = packageId !== null;
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(isPremium !== undefined ? { isPremium } : {}),
                ...(premiumExpiresAt !== undefined ? { premiumExpiresAt } : {}),
                ...(packageId !== undefined ? { packageId } : {}),
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                isPremium: true,
                premiumExpiresAt: true,
                package: { select: { id: true, name: true } },
            },
        });
        return {
            id: updated.id,
            fullName: updated.fullName,
            email: updated.email,
            avatarUrl: updated.avatarUrl,
            isPremium: updated.isPremium,
            packageName: updated.package?.name ?? null,
            packageId: updated.package?.id ?? null,
            expiresAt: updated.premiumExpiresAt?.toISOString() ?? null,
        };
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminUsersService);
//# sourceMappingURL=admin-users.service.js.map