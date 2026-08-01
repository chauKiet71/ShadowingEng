import { LearnVocabularyWordDto, ReviewVocabularyWordDto } from './dto/vocabulary.dto';
import { VocabularyService } from './vocabulary.service';
export declare class VocabularyController {
    private readonly vocabularyService;
    constructor(vocabularyService: VocabularyService);
    getOverview(user: {
        id: string;
    } | null): Promise<{
        stats: {
            totalLearned: number;
            mastered: number;
            learning: number;
            dueCount: number;
            learnedToday: number;
        };
        sets: {
            id: string;
            slug: string;
            title: string;
            description: string;
            icon: string;
            color: string;
            cefrLevel: import("@prisma/client").$Enums.CefrLevel;
            topic: string;
            isFeatured: boolean;
            wordCount: number;
            learnedCount: number;
            saved: boolean;
        }[];
        mySets: {
            id: string;
            slug: string;
            title: string;
            description: string;
            icon: string;
            color: string;
            cefrLevel: import("@prisma/client").$Enums.CefrLevel;
            topic: string;
            wordCount: number;
            learnedCount: number;
            saved: boolean;
        }[];
        dueWords: {
            setTitle: string;
            progress: {
                status: import("@prisma/client").$Enums.VocabularyProgressStatus;
                reviewCount: number;
                correctCount: number;
                nextReviewAt: Date;
            };
            set: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                description: string;
                sortOrder: number;
                icon: string;
                isFeatured: boolean;
                title: string;
                topic: string;
                color: string;
                slug: string;
                cefrLevel: import("@prisma/client").$Enums.CefrLevel;
            };
            id: string;
            createdAt: Date;
            sortOrder: number;
            audioUrl: string | null;
            example: string;
            word: string;
            setId: string;
            phonetic: string | null;
            meaning: string;
            exampleTranslation: string;
        }[];
    }>;
    getSets(user: {
        id: string;
    } | null): Promise<{
        id: string;
        slug: string;
        title: string;
        description: string;
        icon: string;
        color: string;
        cefrLevel: import("@prisma/client").$Enums.CefrLevel;
        topic: string;
        isFeatured: boolean;
        wordCount: number;
        learnedCount: number;
        saved: boolean;
    }[]>;
    getSet(user: {
        id: string;
    } | null, id: string): Promise<{
        saved: boolean;
        words: {
            progress: null;
            id: string;
            createdAt: Date;
            sortOrder: number;
            audioUrl: string | null;
            example: string;
            word: string;
            setId: string;
            phonetic: string | null;
            meaning: string;
            exampleTranslation: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        sortOrder: number;
        icon: string;
        isFeatured: boolean;
        title: string;
        topic: string;
        color: string;
        slug: string;
        cefrLevel: import("@prisma/client").$Enums.CefrLevel;
    } | {
        saved: boolean;
        words: {
            progress: {
                id: string;
                status: import("@prisma/client").$Enums.VocabularyProgressStatus;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                wordId: string;
                reviewCount: number;
                correctCount: number;
                intervalDays: number;
                learnedAt: Date;
                lastReviewedAt: Date | null;
                nextReviewAt: Date;
            };
            id: string;
            createdAt: Date;
            sortOrder: number;
            audioUrl: string | null;
            example: string;
            word: string;
            setId: string;
            phonetic: string | null;
            meaning: string;
            exampleTranslation: string;
        }[];
        savedBy: {
            id: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        sortOrder: number;
        icon: string;
        isFeatured: boolean;
        title: string;
        topic: string;
        color: string;
        slug: string;
        cefrLevel: import("@prisma/client").$Enums.CefrLevel;
    }>;
    saveSet(user: {
        id: string;
    }, id: string): Promise<{
        saved: boolean;
    }>;
    removeSet(user: {
        id: string;
    }, id: string): Promise<{
        saved: boolean;
    }>;
    learnWord(user: {
        id: string;
    }, dto: LearnVocabularyWordDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.VocabularyProgressStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        wordId: string;
        reviewCount: number;
        correctCount: number;
        intervalDays: number;
        learnedAt: Date;
        lastReviewedAt: Date | null;
        nextReviewAt: Date;
    }>;
    reviewWord(user: {
        id: string;
    }, id: string, dto: ReviewVocabularyWordDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.VocabularyProgressStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        wordId: string;
        reviewCount: number;
        correctCount: number;
        intervalDays: number;
        learnedAt: Date;
        lastReviewedAt: Date | null;
        nextReviewAt: Date;
    }>;
}
