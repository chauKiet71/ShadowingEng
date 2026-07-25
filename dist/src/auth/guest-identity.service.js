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
exports.GuestIdentityService = exports.GUEST_EMAIL_SUFFIX = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
exports.GUEST_EMAIL_SUFFIX = '@guest.hihienglish.local';
const GUEST_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let GuestIdentityService = class GuestIdentityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveUserId(authenticatedUser, guestToken) {
        if (authenticatedUser?.id)
            return authenticatedUser.id;
        const token = guestToken?.trim();
        if (!token || !GUEST_TOKEN_PATTERN.test(token)) {
            throw new common_1.UnauthorizedException('Phiên khách không hợp lệ. Vui lòng tải lại trang.');
        }
        const tokenHash = (0, crypto_1.createHash)('sha256')
            .update(token.toLowerCase())
            .digest('hex');
        const email = `guest-${tokenHash}${exports.GUEST_EMAIL_SUFFIX}`;
        const guest = await this.prisma.user.upsert({
            where: { email },
            create: {
                email,
                fullName: 'Khách',
                password: null,
            },
            update: {
                lastActivity: new Date(),
            },
            select: { id: true },
        });
        return guest.id;
    }
};
exports.GuestIdentityService = GuestIdentityService;
exports.GuestIdentityService = GuestIdentityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuestIdentityService);
//# sourceMappingURL=guest-identity.service.js.map