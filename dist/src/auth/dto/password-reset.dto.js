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
exports.ResetPasswordDto = exports.ResendResetCodeDto = exports.VerifyResetCodeDto = exports.ForgotPasswordDto = void 0;
const class_validator_1 = require("class-validator");
class ForgotPasswordDto {
    email;
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email không hợp lệ' }),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
class VerifyResetCodeDto {
    email;
    code;
}
exports.VerifyResetCodeDto = VerifyResetCodeDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email không hợp lệ' }),
    __metadata("design:type", String)
], VerifyResetCodeDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'Mã xác nhận phải có 6 số' }),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Mã xác nhận phải là 6 chữ số' }),
    __metadata("design:type", String)
], VerifyResetCodeDto.prototype, "code", void 0);
class ResendResetCodeDto {
    email;
}
exports.ResendResetCodeDto = ResendResetCodeDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email không hợp lệ' }),
    __metadata("design:type", String)
], ResendResetCodeDto.prototype, "email", void 0);
class ResetPasswordDto {
    resetToken;
    password;
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "resetToken", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, {
        message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
    }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "password", void 0);
//# sourceMappingURL=password-reset.dto.js.map