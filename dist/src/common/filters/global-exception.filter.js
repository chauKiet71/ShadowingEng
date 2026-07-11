"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();
            return response.status(status).json(typeof res === 'string' ? { statusCode: status, message: res } : res);
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`);
            if (['P1001', 'P1000', 'P1017'].includes(exception.code)) {
                return response.status(common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
                    statusCode: 503,
                    message: 'Không thể kết nối database. Vui lòng kiểm tra DATABASE_URL.',
                });
            }
            if (exception.code === 'P2021' || exception.code === 'P2022') {
                return response.status(common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
                    statusCode: 503,
                    message: 'Database chưa sẵn sàng. Hãy khởi động lại server để đồng bộ schema.',
                });
            }
        }
        if (exception instanceof client_1.Prisma.PrismaClientInitializationError) {
            this.logger.error(`Prisma init error: ${exception.message}`);
            return response.status(common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
                statusCode: 503,
                message: 'Lỗi kết nối database. Kiểm tra cấu hình DATABASE_URL trong .env',
            });
        }
        const message = exception instanceof Error ? exception.message : 'Internal server error';
        this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
        return response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: 500,
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : message,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map