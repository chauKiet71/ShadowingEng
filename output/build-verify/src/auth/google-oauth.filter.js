"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GoogleOAuthExceptionFilter = class GoogleOAuthExceptionFilter {
    catch(exception, host) {
        const res = host.switchToHttp().getResponse();
        const message = encodeURIComponent(exception instanceof common_1.HttpException
            ? String(exception.message)
            : exception instanceof Error
                ? exception.message
                : 'Đăng nhập Google thất bại');
        res.redirect(`/xac-thuc-google?error=${message}`);
    }
};
exports.GoogleOAuthExceptionFilter = GoogleOAuthExceptionFilter;
exports.GoogleOAuthExceptionFilter = GoogleOAuthExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GoogleOAuthExceptionFilter);
//# sourceMappingURL=google-oauth.filter.js.map