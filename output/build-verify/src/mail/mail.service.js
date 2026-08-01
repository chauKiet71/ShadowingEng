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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter = null;
    constructor(config) {
        this.config = config;
        const host = this.config.get('SMTP_HOST');
        const port = this.config.get('SMTP_PORT', 587);
        const user = this.config.get('SMTP_USER');
        const pass = this.config.get('SMTP_PASS')?.replace(/\s/g, '');
        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
        }
    }
    async sendPasswordResetCode(email, code) {
        const subject = 'Mã xác nhận đặt lại mật khẩu - Shadowing ENGLISH';
        const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Shadowing ENGLISH</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn là:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${code}</p>
        <p style="color: #666;">Mã có hiệu lực trong <strong>10 phút</strong>.</p>
        <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `;
        if (!this.transporter) {
            this.logger.warn(`[DEV] SMTP chưa cấu hình — Mã OTP cho ${email}: ${code}`);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: this.config.get('SMTP_FROM', 'noreply@shadowing.com'),
                to: email,
                subject,
                html,
            });
            this.logger.log(`Đã gửi mã OTP đến ${email}`);
        }
        catch (error) {
            this.logger.warn(`[DEV] Gửi email thất bại — Mã OTP cho ${email}: ${code}`);
            this.logger.error(error instanceof Error ? error.message : 'Unknown mail error');
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map