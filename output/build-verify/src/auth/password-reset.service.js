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
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
let PasswordResetService = class PasswordResetService {
    prisma;
    mail;
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
    }
    async forgotPassword(dto) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.NotFoundException('Email không tồn tại trong hệ thống');
        }
        await this.createAndSendCode(email);
        return {
            message: 'Chúng tôi đã gửi mã xác nhận đến email của bạn',
            email,
        };
    }
    async resendCode(dto) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.NotFoundException('Email không tồn tại trong hệ thống');
        }
        const latest = await this.prisma.passwordReset.findFirst({
            where: { email, verified: false },
            orderBy: { createdAt: 'desc' },
        });
        if (latest) {
            const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
            if (elapsed < RESEND_COOLDOWN_SECONDS) {
                const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
                throw new common_1.HttpException(`Vui lòng đợi ${remaining} giây trước khi gửi lại mã`, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
        }
        await this.createAndSendCode(email);
        return { message: 'Đã gửi lại mã xác nhận', email };
    }
    async verifyCode(dto) {
        const email = dto.email.toLowerCase().trim();
        const record = await this.prisma.passwordReset.findFirst({
            where: { email, verified: false },
            orderBy: { createdAt: 'desc' },
        });
        if (!record || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
        }
        const valid = await bcrypt.compare(dto.code, record.codeHash);
        if (!valid) {
            throw new common_1.BadRequestException('Mã xác nhận không đúng');
        }
        const resetToken = (0, crypto_1.randomUUID)();
        const tokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.passwordReset.update({
            where: { id: record.id },
            data: { verified: true, resetToken, expiresAt: tokenExpires },
        });
        return { resetToken, message: 'Xác nhận thành công' };
    }
    async resetPassword(dto) {
        const record = await this.prisma.passwordReset.findUnique({
            where: { resetToken: dto.resetToken },
        });
        if (!record || !record.verified || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
        }
        const user = await this.prisma.user.findUnique({
            where: { email: record.email },
        });
        if (!user)
            throw new common_1.NotFoundException('Người dùng không tồn tại');
        const hashed = await bcrypt.hash(dto.password, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
        });
        await this.prisma.passwordReset.deleteMany({
            where: { email: record.email },
        });
        return { message: 'Đặt lại mật khẩu thành công' };
    }
    async createAndSendCode(email) {
        const code = String((0, crypto_1.randomInt)(100000, 999999));
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.passwordReset.deleteMany({
            where: { email, verified: false },
        });
        await this.prisma.passwordReset.create({
            data: { email, codeHash, expiresAt },
        });
        await this.mail.sendPasswordResetCode(email, code);
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map