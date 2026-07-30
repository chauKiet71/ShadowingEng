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
const mail_service_1 = require("../mail/mail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const RESET_REQUEST_MESSAGE = 'Nếu email đã được đăng ký, chúng tôi sẽ gửi mã xác nhận đến hộp thư của bạn';
let PasswordResetService = class PasswordResetService {
    prisma;
    mail;
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
    }
    forgotPassword(dto) {
        return this.requestResetCode(dto.email);
    }
    resendCode(dto) {
        return this.requestResetCode(dto.email);
    }
    async verifyCode(dto) {
        const email = this.normalizeEmail(dto.email);
        const record = await this.prisma.passwordReset.findFirst({
            where: { email, verified: false },
            orderBy: { createdAt: 'desc' },
        });
        if (!record ||
            record.expiresAt <= new Date() ||
            record.attempts >= OTP_MAX_ATTEMPTS) {
            throw new common_1.BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
        }
        const valid = await bcrypt.compare(dto.code, record.codeHash);
        if (!valid) {
            const attempts = record.attempts + 1;
            if (attempts >= OTP_MAX_ATTEMPTS) {
                await this.prisma.passwordReset.delete({ where: { id: record.id } });
            }
            else {
                await this.prisma.passwordReset.update({
                    where: { id: record.id },
                    data: { attempts: { increment: 1 } },
                });
            }
            throw new common_1.BadRequestException(attempts >= OTP_MAX_ATTEMPTS
                ? 'Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới'
                : 'Mã xác nhận không đúng');
        }
        const resetToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const resetTokenHash = this.hashResetToken(resetToken);
        const tokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        const updated = await this.prisma.passwordReset.updateMany({
            where: {
                id: record.id,
                verified: false,
                expiresAt: { gt: new Date() },
            },
            data: {
                verified: true,
                resetToken: resetTokenHash,
                expiresAt: tokenExpires,
            },
        });
        if (updated.count !== 1) {
            throw new common_1.BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
        }
        return { resetToken, message: 'Xác nhận thành công' };
    }
    async resetPassword(dto) {
        const resetTokenHash = this.hashResetToken(dto.resetToken);
        const record = await this.prisma.passwordReset.findUnique({
            where: { resetToken: resetTokenHash },
        });
        if (!record || !record.verified || record.expiresAt <= new Date()) {
            throw new common_1.BadRequestException('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        await this.prisma.$transaction(async (transaction) => {
            const consumed = await transaction.passwordReset.deleteMany({
                where: {
                    id: record.id,
                    resetToken: resetTokenHash,
                    verified: true,
                    expiresAt: { gt: new Date() },
                },
            });
            if (consumed.count !== 1) {
                throw new common_1.BadRequestException('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
            }
            await transaction.user.update({
                where: { email: record.email },
                data: { password: passwordHash },
            });
            await transaction.passwordReset.deleteMany({
                where: { email: record.email },
            });
        });
        return { message: 'Đặt lại mật khẩu thành công' };
    }
    async requestResetCode(rawEmail) {
        const email = this.normalizeEmail(rawEmail);
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (!user)
            return { message: RESET_REQUEST_MESSAGE, email };
        const latest = await this.prisma.passwordReset.findFirst({
            where: { email, verified: false },
            orderBy: { createdAt: 'desc' },
        });
        if (latest) {
            const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
            if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
                return { message: RESET_REQUEST_MESSAGE, email };
            }
        }
        await this.createAndSendCode(email);
        return { message: RESET_REQUEST_MESSAGE, email };
    }
    async createAndSendCode(email) {
        const code = String((0, crypto_1.randomInt)(100000, 1_000_000));
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.passwordReset.deleteMany({ where: { email } });
        const record = await this.prisma.passwordReset.create({
            data: { email, codeHash, expiresAt },
        });
        try {
            await this.mail.sendPasswordResetCode(email, code);
        }
        catch (error) {
            await this.prisma.passwordReset.deleteMany({ where: { id: record.id } });
            throw error;
        }
    }
    normalizeEmail(email) {
        return email.toLowerCase().trim();
    }
    hashResetToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map