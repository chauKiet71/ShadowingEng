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
const SETS = [
    {
        slug: 'du-lich-co-ban',
        title: 'Du lịch cơ bản',
        description: 'Những từ cần thiết cho chuyến đi đầu tiên',
        icon: 'plane',
        color: 'blue',
        cefrLevel: client_1.CefrLevel.A1,
        topic: 'Du lịch',
        isFeatured: true,
        sortOrder: 1,
        words: [
            ['passport', '/ˈpɑːspɔːrt/', 'hộ chiếu', 'Please show me your passport.', 'Vui lòng cho tôi xem hộ chiếu.'],
            ['luggage', '/ˈlʌɡɪdʒ/', 'hành lý', 'My luggage is very heavy.', 'Hành lý của tôi rất nặng.'],
            ['ticket', '/ˈtɪkɪt/', 'vé', 'I bought a train ticket.', 'Tôi đã mua một vé tàu.'],
            ['airport', '/ˈerpɔːrt/', 'sân bay', 'We arrived at the airport early.', 'Chúng tôi đến sân bay sớm.'],
            ['hotel', '/hoʊˈtel/', 'khách sạn', 'Our hotel is near the beach.', 'Khách sạn của chúng tôi gần bãi biển.'],
            ['map', '/mæp/', 'bản đồ', 'Can I have a city map?', 'Tôi có thể lấy một tấm bản đồ thành phố không?'],
            ['journey', '/ˈdʒɜːrni/', 'hành trình', 'The journey took three hours.', 'Hành trình kéo dài ba giờ.'],
            ['souvenir', '/ˌsuːvəˈnɪr/', 'quà lưu niệm', 'I bought a small souvenir.', 'Tôi đã mua một món quà lưu niệm nhỏ.'],
        ],
    },
    {
        slug: 'giao-tiep-hang-ngay',
        title: 'Giao tiếp hằng ngày',
        description: 'Từ vựng quen thuộc dùng mỗi ngày',
        icon: 'message-circle',
        color: 'purple',
        cefrLevel: client_1.CefrLevel.A1,
        topic: 'Cuộc sống',
        isFeatured: true,
        sortOrder: 2,
        words: [
            ['morning', '/ˈmɔːrnɪŋ/', 'buổi sáng', 'I exercise every morning.', 'Tôi tập thể dục mỗi sáng.'],
            ['breakfast', '/ˈbrekfəst/', 'bữa sáng', 'Breakfast is ready.', 'Bữa sáng đã sẵn sàng.'],
            ['neighbor', '/ˈneɪbər/', 'hàng xóm', 'My neighbor is very friendly.', 'Hàng xóm của tôi rất thân thiện.'],
            ['usually', '/ˈjuːʒuəli/', 'thường xuyên', 'I usually walk to work.', 'Tôi thường đi bộ đến nơi làm việc.'],
            ['together', '/təˈɡeðər/', 'cùng nhau', 'We cook dinner together.', 'Chúng tôi nấu bữa tối cùng nhau.'],
            ['busy', '/ˈbɪzi/', 'bận rộn', 'Today is a busy day.', 'Hôm nay là một ngày bận rộn.'],
            ['relax', '/rɪˈlæks/', 'thư giãn', 'I relax after dinner.', 'Tôi thư giãn sau bữa tối.'],
            ['weekend', '/ˌwiːkˈend/', 'cuối tuần', 'What do you do on weekends?', 'Bạn làm gì vào cuối tuần?'],
        ],
    },
    {
        slug: 'cong-viec-van-phong',
        title: 'Công việc văn phòng',
        description: 'Giao tiếp chuyên nghiệp tại nơi làm việc',
        icon: 'briefcase',
        color: 'teal',
        cefrLevel: client_1.CefrLevel.A2,
        topic: 'Công việc',
        isFeatured: true,
        sortOrder: 3,
        words: [
            ['meeting', '/ˈmiːtɪŋ/', 'cuộc họp', 'The meeting starts at nine.', 'Cuộc họp bắt đầu lúc chín giờ.'],
            ['deadline', '/ˈdedlaɪn/', 'hạn chót', 'The deadline is next Friday.', 'Hạn chót là thứ Sáu tuần sau.'],
            ['colleague', '/ˈkɑːliːɡ/', 'đồng nghiệp', 'My colleague helped me.', 'Đồng nghiệp đã giúp tôi.'],
            ['project', '/ˈprɑːdʒekt/', 'dự án', 'This project is important.', 'Dự án này rất quan trọng.'],
            ['schedule', '/ˈskedʒuːl/', 'lịch trình', 'Please check your schedule.', 'Vui lòng kiểm tra lịch trình của bạn.'],
            ['report', '/rɪˈpɔːrt/', 'báo cáo', 'I finished the monthly report.', 'Tôi đã hoàn thành báo cáo tháng.'],
            ['client', '/ˈklaɪənt/', 'khách hàng', 'The client liked our idea.', 'Khách hàng thích ý tưởng của chúng tôi.'],
            ['manager', '/ˈmænɪdʒər/', 'quản lý', 'I spoke with my manager.', 'Tôi đã nói chuyện với quản lý.'],
        ],
    },
    {
        slug: 'phim-anh-giai-tri',
        title: 'Phim ảnh & Giải trí',
        description: 'Thảo luận về phim và chương trình yêu thích',
        icon: 'clapperboard',
        color: 'pink',
        cefrLevel: client_1.CefrLevel.B1,
        topic: 'Giải trí',
        isFeatured: false,
        sortOrder: 4,
        words: [
            ['character', '/ˈkærəktər/', 'nhân vật', 'The main character is brave.', 'Nhân vật chính rất dũng cảm.'],
            ['plot', '/plɑːt/', 'cốt truyện', 'The plot was surprising.', 'Cốt truyện thật bất ngờ.'],
            ['director', '/dəˈrektər/', 'đạo diễn', 'She is a famous director.', 'Cô ấy là một đạo diễn nổi tiếng.'],
            ['scene', '/siːn/', 'cảnh phim', 'That was my favorite scene.', 'Đó là cảnh phim tôi yêu thích.'],
            ['performance', '/pərˈfɔːrməns/', 'màn trình diễn', 'His performance was excellent.', 'Màn trình diễn của anh ấy rất xuất sắc.'],
            ['audience', '/ˈɔːdiəns/', 'khán giả', 'The audience laughed loudly.', 'Khán giả đã cười lớn.'],
            ['episode', '/ˈepɪsoʊd/', 'tập phim', 'I watched the final episode.', 'Tôi đã xem tập cuối.'],
            ['recommend', '/ˌrekəˈmend/', 'đề xuất', 'I recommend this movie.', 'Tôi đề xuất bộ phim này.'],
        ],
    },
    ...vocabulary_tech_sets_1.TECH_VOCABULARY_SETS,
];
let VocabularyService = class VocabularyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    addDays(date, days) {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
    }
    async ensureCatalog() {
        const keepSlugs = SETS.map((set) => set.slug);
        await this.prisma.vocabularySet.deleteMany({
            where: {
                slug: {
                    startsWith: 'cong-nghe-',
                    notIn: keepSlugs,
                },
            },
        });
        for (const set of SETS) {
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
            for (const [index, word] of set.words.entries()) {
                await this.prisma.vocabularyWord.upsert({
                    where: {
                        setId_word: {
                            setId: vocabularySet.id,
                            word: word[0],
                        },
                    },
                    create: {
                        setId: vocabularySet.id,
                        word: word[0],
                        phonetic: word[1],
                        meaning: word[2],
                        example: word[3],
                        exampleTranslation: word[4],
                        sortOrder: index + 1,
                    },
                    update: {
                        phonetic: word[1],
                        meaning: word[2],
                        example: word[3],
                        exampleTranslation: word[4],
                        sortOrder: index + 1,
                    },
                });
            }
        }
    }
    async getOverview(userId) {
        await this.ensureCatalog();
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const [totalLearned, mastered, dueCount, learnedToday, sets, mySets, dueWords,] = await Promise.all([
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
                    words: {
                        select: {
                            progress: {
                                where: { userId },
                                select: { id: true, status: true },
                            },
                        },
                    },
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
        ]);
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
                learnedCount: set.words.filter((w) => w.progress.length > 0).length,
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