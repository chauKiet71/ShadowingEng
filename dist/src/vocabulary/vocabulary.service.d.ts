import { PrismaService } from '../prisma/prisma.service';
export declare class VocabularyService {
    private readonly prisma;
    private catalogSync;
    constructor(prisma: PrismaService);
    private addDays;
    private ensureCatalog;
    private syncCatalog;
    getOverview(userId: string): Promise<{
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
    getSets(userId: string): Promise<{
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
    getSet(userId: string, id: string): Promise<{
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
    saveSet(userId: string, setId: string): Promise<{
        saved: boolean;
    }>;
    removeSet(userId: string, setId: string): Promise<{
        saved: boolean;
    }>;
    learnWord(userId: string, wordId: string): Promise<{
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
    reviewWord(userId: string, wordId: string, correct: boolean): Promise<{
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
