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
exports.VideoTranslateController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const guest_identity_service_1 = require("../auth/guest-identity.service");
const optional_jwt_auth_guard_1 = require("../auth/optional-jwt-auth.guard");
const video_translate_service_1 = require("./video-translate.service");
const MAX_UPLOAD_BYTES = 120 * 1024 * 1024;
let VideoTranslateController = class VideoTranslateController {
    videoTranslateService;
    guestIdentity;
    constructor(videoTranslateService, guestIdentity) {
        this.videoTranslateService = videoTranslateService;
        this.guestIdentity = guestIdentity;
    }
    async getQuota(user, guestToken) {
        const userId = await this.guestIdentity.resolveUserId(user, guestToken);
        return this.videoTranslateService.getQuota(userId);
    }
    async listJobs(user, guestToken) {
        const userId = await this.guestIdentity.resolveUserId(user, guestToken);
        return this.videoTranslateService.listJobs(userId);
    }
    async getJob(user, guestToken, id) {
        const userId = await this.guestIdentity.resolveUserId(user, guestToken);
        return this.videoTranslateService.getJob(userId, id);
    }
    async createJob(user, guestToken, file) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Hãy chọn file video hoặc audio để dịch');
        }
        const userId = await this.guestIdentity.resolveUserId(user, guestToken);
        return this.videoTranslateService.createJobFromUpload(userId, file);
    }
    async deleteJob(user, guestToken, id) {
        const userId = await this.guestIdentity.resolveUserId(user, guestToken);
        return this.videoTranslateService.deleteJob(userId, id);
    }
};
exports.VideoTranslateController = VideoTranslateController;
__decorate([
    (0, common_1.Get)('quota'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-guest-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VideoTranslateController.prototype, "getQuota", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-guest-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VideoTranslateController.prototype, "listJobs", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-guest-token')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], VideoTranslateController.prototype, "getJob", null);
__decorate([
    (0, common_1.Post)('jobs'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: MAX_UPLOAD_BYTES },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-guest-token')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], VideoTranslateController.prototype, "createJob", null);
__decorate([
    (0, common_1.Delete)('jobs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-guest-token')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], VideoTranslateController.prototype, "deleteJob", null);
exports.VideoTranslateController = VideoTranslateController = __decorate([
    (0, common_1.Controller)('video-translate'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __metadata("design:paramtypes", [video_translate_service_1.VideoTranslateService,
        guest_identity_service_1.GuestIdentityService])
], VideoTranslateController);
//# sourceMappingURL=video-translate.controller.js.map