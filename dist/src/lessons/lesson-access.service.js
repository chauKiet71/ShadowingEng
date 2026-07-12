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
exports.LessonAccessService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LessonAccessService = class LessonAccessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAccessMap() {
        const rows = await this.prisma.lessonAccess.findMany({
            select: { lessonId: true, isLocked: true },
        });
        return Object.fromEntries(rows.map((row) => [row.lessonId, row.isLocked]));
    }
    async getLockedLessonIds() {
        const rows = await this.prisma.lessonAccess.findMany({
            where: { isLocked: true },
            select: { lessonId: true },
        });
        return rows.map((row) => row.lessonId);
    }
    async setLocked(lessonId, isLocked) {
        const row = await this.prisma.lessonAccess.upsert({
            where: { lessonId },
            create: { lessonId, isLocked },
            update: { isLocked },
            select: { lessonId: true, isLocked: true, updatedAt: true },
        });
        return row;
    }
};
exports.LessonAccessService = LessonAccessService;
exports.LessonAccessService = LessonAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonAccessService);
//# sourceMappingURL=lesson-access.service.js.map