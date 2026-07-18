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
exports.SpeakingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_speaking_session_dto_1 = require("./dto/create-speaking-session.dto");
const translate_speaking_dto_1 = require("./dto/translate-speaking.dto");
const speaking_service_1 = require("./speaking.service");
let SpeakingController = class SpeakingController {
    speakingService;
    constructor(speakingService) {
        this.speakingService = speakingService;
    }
    listScenarios() {
        return this.speakingService.listScenarios();
    }
    getQuota(user) {
        return this.speakingService.getQuota(user.id);
    }
    createSession(user, dto) {
        return this.speakingService.createSession(user.id, dto.scenarioId, dto.level, dto.dialect);
    }
    translate(dto) {
        return this.speakingService.translateToVietnamese(dto.text);
    }
    getSession(user, id) {
        return this.speakingService.getSession(user.id, id);
    }
    submitTurn(user, id, file, durationMsRaw) {
        if (!file) {
            throw new common_1.BadRequestException('Vui lòng gửi bản ghi âm');
        }
        const durationMs = durationMsRaw != null && durationMsRaw !== ''
            ? Number(durationMsRaw)
            : undefined;
        return this.speakingService.submitTurn(user.id, id, file, Number.isFinite(durationMs) ? durationMs : undefined);
    }
    completeSession(user, id) {
        return this.speakingService.completeSession(user.id, id);
    }
};
exports.SpeakingController = SpeakingController;
__decorate([
    (0, common_1.Get)('scenarios'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "listScenarios", null);
__decorate([
    (0, common_1.Get)('quota'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "getQuota", null);
__decorate([
    (0, common_1.Post)('sessions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_speaking_session_dto_1.CreateSpeakingSessionDto]),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)('translate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [translate_speaking_dto_1.TranslateSpeakingDto]),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "translate", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "getSession", null);
__decorate([
    (0, common_1.Post)('sessions/:id/turns'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('audio', {
        limits: { fileSize: speaking_service_1.MAX_SPEAKING_AUDIO_BYTES },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('durationMs')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "submitTurn", null);
__decorate([
    (0, common_1.Post)('sessions/:id/complete'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SpeakingController.prototype, "completeSession", null);
exports.SpeakingController = SpeakingController = __decorate([
    (0, common_1.Controller)('speaking'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [speaking_service_1.SpeakingService])
], SpeakingController);
//# sourceMappingURL=speaking.controller.js.map