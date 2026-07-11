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
var ShadowingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const shadowing_service_1 = require("./shadowing.service");
let ShadowingGateway = ShadowingGateway_1 = class ShadowingGateway {
    shadowingService;
    logger = new common_1.Logger(ShadowingGateway_1.name);
    server;
    constructor(shadowingService) {
        this.shadowingService = shadowingService;
    }
    handleConnection(client) {
        client.send(JSON.stringify({
            type: 'connected',
            ready: this.shadowingService.isConfigured(),
        }));
        client.on('message', (raw) => {
            void this.handleClientMessage(client, raw.toString());
        });
    }
    handleDisconnect() {
        this.logger.debug('Shadowing client disconnected');
    }
    async handleClientMessage(client, raw) {
        let message;
        try {
            message = JSON.parse(raw);
        }
        catch {
            client.send(JSON.stringify({ type: 'error', message: 'Tin nhắn không hợp lệ' }));
            return;
        }
        if (message.type === 'start') {
            client.send(JSON.stringify({
                type: 'ready',
                expectedText: message.expectedText ?? '',
            }));
            return;
        }
        if (message.type === 'stop') {
            if (!message.expectedText || !message.audio) {
                client.send(JSON.stringify({
                    type: 'error',
                    message: 'Thiếu dữ liệu ghi âm hoặc câu mẫu',
                }));
                return;
            }
            try {
                client.send(JSON.stringify({ type: 'processing' }));
                const result = await this.shadowingService.scoreRecording(message.audio, message.expectedText);
                client.send(JSON.stringify({ type: 'result', ...result }));
            }
            catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Không thể chấm điểm ghi âm';
                this.logger.error(errorMessage);
                client.send(JSON.stringify({ type: 'error', message: errorMessage }));
            }
        }
    }
};
exports.ShadowingGateway = ShadowingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], ShadowingGateway.prototype, "server", void 0);
exports.ShadowingGateway = ShadowingGateway = ShadowingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ path: '/api/shadowing' }),
    __metadata("design:paramtypes", [shadowing_service_1.ShadowingService])
], ShadowingGateway);
//# sourceMappingURL=shadowing.gateway.js.map