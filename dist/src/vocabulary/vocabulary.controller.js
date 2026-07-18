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
exports.VocabularyController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const vocabulary_dto_1 = require("./dto/vocabulary.dto");
const vocabulary_service_1 = require("./vocabulary.service");
let VocabularyController = class VocabularyController {
    vocabularyService;
    constructor(vocabularyService) {
        this.vocabularyService = vocabularyService;
    }
    getOverview(user) {
        return this.vocabularyService.getOverview(user.id);
    }
    getSets(user) {
        return this.vocabularyService.getSets(user.id);
    }
    getSet(user, id) {
        return this.vocabularyService.getSet(user.id, id);
    }
    saveSet(user, id) {
        return this.vocabularyService.saveSet(user.id, id);
    }
    removeSet(user, id) {
        return this.vocabularyService.removeSet(user.id, id);
    }
    learnWord(user, dto) {
        return this.vocabularyService.learnWord(user.id, dto.wordId);
    }
    reviewWord(user, id, dto) {
        return this.vocabularyService.reviewWord(user.id, id, dto.correct);
    }
};
exports.VocabularyController = VocabularyController;
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('sets'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "getSets", null);
__decorate([
    (0, common_1.Get)('sets/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "getSet", null);
__decorate([
    (0, common_1.Post)('sets/:id/save'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "saveSet", null);
__decorate([
    (0, common_1.Delete)('sets/:id/save'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "removeSet", null);
__decorate([
    (0, common_1.Post)('words/learn'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, vocabulary_dto_1.LearnVocabularyWordDto]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "learnWord", null);
__decorate([
    (0, common_1.Post)('words/:id/review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, vocabulary_dto_1.ReviewVocabularyWordDto]),
    __metadata("design:returntype", void 0)
], VocabularyController.prototype, "reviewWord", null);
exports.VocabularyController = VocabularyController = __decorate([
    (0, common_1.Controller)('vocabulary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [vocabulary_service_1.VocabularyService])
], VocabularyController);
//# sourceMappingURL=vocabulary.controller.js.map