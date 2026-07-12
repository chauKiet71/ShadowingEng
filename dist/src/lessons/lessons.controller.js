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
exports.LessonsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_guard_1 = require("../auth/admin.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const lessons_service_1 = require("./lessons.service");
const lesson_access_service_1 = require("./lesson-access.service");
const update_lesson_access_dto_1 = require("./dto/update-lesson-access.dto");
let LessonsController = class LessonsController {
    lessonsService;
    lessonAccessService;
    constructor(lessonsService, lessonAccessService) {
        this.lessonsService = lessonsService;
        this.lessonAccessService = lessonAccessService;
    }
    getAccessMap() {
        return this.lessonAccessService.getAccessMap();
    }
    setAccess(lessonId, dto) {
        return this.lessonAccessService.setLocked(lessonId, dto.isLocked);
    }
    findAll(featured, categoryId) {
        return this.lessonsService.findAll({
            featured: featured === 'true',
            categoryId,
        });
    }
    getMyStats(user) {
        return this.lessonsService.getHistoryStats(user.id);
    }
    getHistory(userId, status) {
        return this.lessonsService.getHistory(userId, status);
    }
    getHistoryStats(userId) {
        return this.lessonsService.getHistoryStats(userId);
    }
    findOne(id) {
        return this.lessonsService.findOne(id);
    }
};
exports.LessonsController = LessonsController;
__decorate([
    (0, common_1.Get)('access'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "getAccessMap", null);
__decorate([
    (0, common_1.Put)('access/:lessonId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_lesson_access_dto_1.UpdateLessonAccessDto]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "setAccess", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('featured')),
    __param(1, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "getMyStats", null);
__decorate([
    (0, common_1.Get)('history/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('history/:userId/stats'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "getHistoryStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "findOne", null);
exports.LessonsController = LessonsController = __decorate([
    (0, common_1.Controller)('lessons'),
    __metadata("design:paramtypes", [lessons_service_1.LessonsService,
        lesson_access_service_1.LessonAccessService])
], LessonsController);
//# sourceMappingURL=lessons.controller.js.map