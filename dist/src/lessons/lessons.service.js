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
exports.LessonsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LessonsService = class LessonsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const where = {};
        if (params?.featured)
            where.isFeatured = true;
        if (params?.categoryId)
            where.categoryId = params.categoryId;
        return this.prisma.lesson.findMany({
            where,
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        return this.prisma.lesson.findUnique({
            where: { id },
            include: {
                category: true,
                transcripts: { orderBy: { orderIndex: 'asc' } },
            },
        });
    }
    async getHistory(userId, status) {
        const where = { userId };
        if (status && status !== 'all')
            where.status = status.toUpperCase();
        return this.prisma.userLessonHistory.findMany({
            where,
            include: { lesson: { include: { category: true } } },
            orderBy: { lastListenedAt: 'desc' },
        });
    }
    async getHistoryStats(userId) {
        const completedLessons = await this.prisma.userLessonHistory.count({
            where: { userId, status: 'COMPLETED' },
        });
        const histories = await this.prisma.userLessonHistory.findMany({
            where: { userId },
        });
        const lessonsListened = histories.length;
        const hoursListened = histories.reduce((sum, h) => sum + h.listenedSeconds, 0) / 3600;
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        return {
            completedLessons,
            lessonsListened,
            hoursListened: Math.round(hoursListened * 10) / 10,
            streakDays: user?.streakDays || 0,
            weeklyGoal: 20,
            weeklyProgress: Math.min(12.6, hoursListened),
        };
    }
};
exports.LessonsService = LessonsService;
exports.LessonsService = LessonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonsService);
//# sourceMappingURL=lessons.service.js.map