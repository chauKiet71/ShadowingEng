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
const current_user_decorator_1 = require("../auth/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_video_translate_dto_1 = require("./dto/create-video-translate.dto");
const video_translate_service_1 = require("./video-translate.service");
let VideoTranslateController = class VideoTranslateController {
    videoTranslateService;
    constructor(videoTranslateService) {
        this.videoTranslateService = videoTranslateService;
    }
    getQuota(user) {
        return this.videoTranslateService.getQuota(user.id);
    }
    listJobs(user) {
        return this.videoTranslateService.listJobs(user.id);
    }
    getJob(user, id) {
        return this.videoTranslateService.getJob(user.id, id);
    }
    createJob(user, dto) {
        return this.videoTranslateService.createJob(user.id, dto.url);
    }
    deleteJob(user, id) {
        return this.videoTranslateService.deleteJob(user.id, id);
    }
};
exports.VideoTranslateController = VideoTranslateController;
__decorate([
    (0, common_1.Get)('quota'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoTranslateController.prototype, "getQuota", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoTranslateController.prototype, "listJobs", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VideoTranslateController.prototype, "getJob", null);
__decorate([
    (0, common_1.Post)('jobs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_video_translate_dto_1.CreateVideoTranslateDto]),
    __metadata("design:returntype", void 0)
], VideoTranslateController.prototype, "createJob", null);
__decorate([
    (0, common_1.Delete)('jobs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VideoTranslateController.prototype, "deleteJob", null);
exports.VideoTranslateController = VideoTranslateController = __decorate([
    (0, common_1.Controller)('video-translate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [video_translate_service_1.VideoTranslateService])
], VideoTranslateController);
//# sourceMappingURL=video-translate.controller.js.map
