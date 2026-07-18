import { LearnVocabularyWordDto, ReviewVocabularyWordDto } from './dto/vocabulary.dto';
import { VocabularyService } from './vocabulary.service';
export declare class VocabularyController {
    private readonly vocabularyService;
    constructor(vocabularyService: VocabularyService);
    getOverview(user: {
        id: string;
    }): Promise<{
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
                slug: string;
                color: string;
                cefrLevel: import("@prisma/client").$Enums.CefrLevel;
            };
            id: string;
            createdAt: Date;
            sortOrder: number;
            audioUrl: string | null;
            setId: string;
            word: string;
            phonetic: string | null;
            meaning: string;
            example: string;
            exampleTranslation: string;
        }[];
    }>;
    getSets(user: {
        id: string;
    }): Promise<{
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
    }, id: string): Promise<{
        saved: boolean;
        words: {
            progress: {
                status: import("@prisma/client").$Enums.VocabularyProgressStatus;
                id: string;
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
            setId: string;
            word: string;
            phonetic: string | null;
            meaning: string;
            example: string;
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
        slug: string;
        color: string;
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
        status: import("@prisma/client").$Enums.VocabularyProgressStatus;
        id: string;
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
        status: import("@prisma/client").$Enums.VocabularyProgressStatus;
        id: string;
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
