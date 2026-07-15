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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_payment_order_dto_1 = require("./dto/create-payment-order.dto");
const sepay_webhook_dto_1 = require("./dto/sepay-webhook.dto");
const payments_service_1 = require("./payments.service");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    createOrder(req, dto) {
        return this.paymentsService.createOrder(req.user.id, dto.packageId);
    }
    getOrder(req, id) {
        return this.paymentsService.getOrder(req.user.id, id);
    }
    receiveSepayWebhook(req, authorization, signature, timestamp, dto) {
        this.paymentsService.verifyWebhook(authorization, signature, timestamp, req.rawBody);
        return this.paymentsService.processWebhook(dto);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_payment_order_dto_1.CreatePaymentOrderDto]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getOrder", null);
__decorate([
    (0, common_1.Post)('webhooks/sepay'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __param(2, (0, common_1.Headers)('x-sepay-signature')),
    __param(3, (0, common_1.Headers)('x-sepay-timestamp')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, sepay_webhook_dto_1.SepayWebhookDto]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "receiveSepayWebhook", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map