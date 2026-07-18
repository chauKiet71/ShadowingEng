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
exports.VocabularyService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const vocabulary_tech_sets_1 = require("./vocabulary-tech-sets");
const vocabulary_travel_set_1 = require("./vocabulary-travel-set");
const vocabulary_daily_set_1 = require("./vocabulary-daily-set");
const vocabulary_movie_set_1 = require("./vocabulary-movie-set");
const vocabulary_office_set_1 = require("./vocabulary-office-set");
const vocabulary_education_set_1 = require("./vocabulary-education-set");
const vocabulary_economy_set_1 = require("./vocabulary-economy-set");
const vocabulary_business_set_1 = require("./vocabulary-business-set");
const vocabulary_banking_set_1 = require("./vocabulary-banking-set");
const vocabulary_finance_set_1 = require("./vocabulary-finance-set");
const SETS = [
    vocabulary_travel_set_1.TRAVEL_VOCABULARY_SET,
    vocabulary_daily_set_1.DAILY_VOCABULARY_SET,
    vocabulary_office_set_1.OFFICE_VOCABULARY_SET,
    vocabulary_movie_set_1.MOVIE_VOCABULARY_SET,
    ...vocabulary_tech_sets_1.TECH_VOCABULARY_SETS,
    vocabulary_education_set_1.EDUCATION_VOCABULARY_SET,
    vocabulary_economy_set_1.ECONOMY_VOCABULARY_SET,
    vocabulary_business_set_1.BUSINESS_VOCABULARY_SET,
    vocabulary_banking_set_1.BANKING_VOCABULARY_SET,
    vocabulary_finance_set_1.FINANCE_VOCABULARY_SET,
];
let VocabularyService = class VocabularyService {
    prisma;
    catalogSync = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    addDays(date, days) {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
    }
    ensureCatalog() {
        if (!this.catalogSync) {
            this.catalogSync = this.syncCatalog().catch((error) => {
                this.catalogSync = null;
                throw error;
            });
        }
        return this.catalogSync;
    }
    async syncCatalog() {
        const keepSlugs = SETS.map((set) => set.slug);
        await this.prisma.vocabularySet.deleteMany({
            where: {
                slug: {
                    startsWith: 'cong-nghe-',
                    notIn: keepSlugs,
                },
            },
        });
        const existing = await this.prisma.vocabularySet.findMany({
            where: { slug: { in: keepSlugs } },
            select: {
                id: true,
                slug: true,
                _count: { select: { words: true } },
            },
        });
        const bySlug = new Map(existing.map((set) => [set.slug, set]));
        const alreadySynced = SETS.every((set) => {
            const found = bySlug.get(set.slug);
            return !!found && found._count.words === set.words.length;
        });
        if (alreadySynced)
            return;
        for (const set of SETS) {
            const current = bySlug.get(set.slug);
            if (current && current._count.words === set.words.length) {
                await this.prisma.vocabularySet.update({
                    where: { id: current.id },
                    data: {
                        title: set.title,
                        description: set.description,
                        icon: set.icon,
                        color: set.color,
                        cefrLevel: set.cefrLevel,
                        topic: set.topic,
                        isFeatured: set.isFeatured,
                        sortOrder: set.sortOrder,
                    },
                });
                continue;
            }
            const vocabularySet = await this.prisma.vocabularySet.upsert({
                where: { slug: set.slug },
                create: {
                    slug: set.slug,
                    title: set.title,
                    description: set.description,
                    icon: set.icon,
                    color: set.color,
                    cefrLevel: set.cefrLevel,
                    topic: set.topic,
                    isFeatured: set.isFeatured,
                    sortOrder: set.sortOrder,
                },
                update: {
                    title: set.title,
                    description: set.description,
                    icon: set.icon,
                    color: set.color,
                    cefrLevel: set.cefrLevel,
                    topic: set.topic,
                    isFeatured: set.isFeatured,
                    sortOrder: set.sortOrder,
                },
            });
            await this.prisma.vocabularyWord.deleteMany({
                where: { setId: vocabularySet.id },
            });
            await this.prisma.vocabularyWord.createMany({
                data: set.words.map((word, index) => ({
                    setId: vocabularySet.id,
                    word: word[0],
                    phonetic: word[1],
                    meaning: word[2],
                    example: word[3],
                    exampleTranslation: word[4],
                    sortOrder: index + 1,
                })),
            });
        }
    }
    async getOverview(userId) {
        await this.ensureCatalog();
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const [totalLearned, mastered, dueCount, learnedToday, sets, mySets, dueWords, learnedProgress,] = await Promise.all([
            this.prisma.userVocabularyProgress.count({ where: { userId } }),
            this.prisma.userVocabularyProgress.count({
                where: { userId, status: client_1.VocabularyProgressStatus.MASTERED },
            }),
            this.prisma.userVocabularyProgress.count({
                where: { userId, nextReviewAt: { lte: now } },
            }),
            this.prisma.userVocabularyProgress.count({
                where: { userId, learnedAt: { gte: startOfDay } },
            }),
            this.prisma.vocabularySet.findMany({
                orderBy: { sortOrder: 'asc' },
                include: {
                    _count: { select: { words: true } },
                    savedBy: { where: { userId }, select: { id: true } },
                },
            }),
            this.prisma.userVocabularySet.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    set: {
                        include: { _count: { select: { words: true } } },
                    },
                },
            }),
            this.prisma.userVocabularyProgress.findMany({
                where: { userId, nextReviewAt: { lte: now } },
                orderBy: { nextReviewAt: 'asc' },
                take: 20,
                include: { word: { include: { set: true } } },
            }),
            this.prisma.userVocabularyProgress.findMany({
                where: { userId },
                select: { word: { select: { setId: true } } },
            }),
        ]);
        const learnedCountBySet = new Map();
        for (const item of learnedProgress) {
            const setId = item.word.setId;
            learnedCountBySet.set(setId, (learnedCountBySet.get(setId) ?? 0) + 1);
        }
        return {
            stats: {
                totalLearned,
                mastered,
                learning: totalLearned - mastered,
                dueCount,
                learnedToday,
            },
            sets: sets.map((set) => ({
                id: set.id,
                slug: set.slug,
                title: set.title,
                description: set.description,
                icon: set.icon,
                color: set.color,
                cefrLevel: set.cefrLevel,
                topic: set.topic,
                isFeatured: set.isFeatured,
                wordCount: set._count.words,
                learnedCount: learnedCountBySet.get(set.id) ?? 0,
                saved: set.savedBy.length > 0,
            })),
            mySets: mySets.map(({ set }) => ({
                id: set.id,
                slug: set.slug,
                title: set.title,
                description: set.description,
                icon: set.icon,
                color: set.color,
                cefrLevel: set.cefrLevel,
                topic: set.topic,
                wordCount: set._count.words,
                learnedCount: learnedCountBySet.get(set.id) ?? 0,
                saved: true,
            })),
            dueWords: dueWords.map((progress) => ({
                ...progress.word,
                setTitle: progress.word.set.title,
                progress: {
                    status: progress.status,
                    reviewCount: progress.reviewCount,
                    correctCount: progress.correctCount,
                    nextReviewAt: progress.nextReviewAt,
                },
            })),
        };
    }
    async getSets(userId) {
        const overview = await this.getOverview(userId);
        return overview.sets;
    }
    async getSet(userId, id) {
        await this.ensureCatalog();
        const set = await this.prisma.vocabularySet.findUnique({
            where: { id },
            include: {
                savedBy: { where: { userId }, select: { id: true } },
                words: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        progress: { where: { userId } },
                    },
                },
            },
        });
        if (!set)
            throw new common_1.NotFoundException('Không tìm thấy bộ từ vựng');
        return {
            ...set,
            saved: set.savedBy.length > 0,
            words: set.words.map((word) => ({
                ...word,
                progress: word.progress[0] ?? null,
            })),
        };
    }
    async saveSet(userId, setId) {
        await this.prisma.vocabularySet.findUniqueOrThrow({
            where: { id: setId },
        });
        await this.prisma.userVocabularySet.upsert({
            where: { userId_setId: { userId, setId } },
            create: { userId, setId },
            update: {},
        });
        return { saved: true };
    }
    async removeSet(userId, setId) {
        await this.prisma.userVocabularySet.deleteMany({
            where: { userId, setId },
        });
        return { saved: false };
    }
    async learnWord(userId, wordId) {
        await this.prisma.vocabularyWord.findUniqueOrThrow({
            where: { id: wordId },
        });
        const now = new Date();
        return this.prisma.userVocabularyProgress.upsert({
            where: { userId_wordId: { userId, wordId } },
            create: {
                userId,
                wordId,
                learnedAt: now,
                nextReviewAt: this.addDays(now, 1),
            },
            update: {},
        });
    }
    async reviewWord(userId, wordId, correct) {
        let progress = await this.prisma.userVocabularyProgress.findUnique({
            where: { userId_wordId: { userId, wordId } },
        });
        if (!progress) {
            progress = await this.learnWord(userId, wordId);
        }
        const reviewCount = progress.reviewCount + 1;
        const correctCount = progress.correctCount + (correct ? 1 : 0);
        const intervals = [1, 3, 7, 14, 30, 60];
        const intervalDays = correct
            ? intervals[Math.min(correctCount, intervals.length - 1)]
            : 1;
        const status = correctCount >= 4
            ? client_1.VocabularyProgressStatus.MASTERED
            : client_1.VocabularyProgressStatus.LEARNING;
        const now = new Date();
        return this.prisma.userVocabularyProgress.update({
            where: { id: progress.id },
            data: {
                reviewCount,
                correctCount,
                intervalDays,
                status,
                lastReviewedAt: now,
                nextReviewAt: this.addDays(now, intervalDays),
            },
        });
    }
};
exports.VocabularyService = VocabularyService;
exports.VocabularyService = VocabularyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VocabularyService);
//# sourceMappingURL=vocabulary.service.js.map