import { LessonsService } from './lessons.service';
import { LessonAccessService } from './lesson-access.service';
import { UpdateLessonAccessDto } from './dto/update-lesson-access.dto';
export declare class LessonsController {
    private lessonsService;
    private lessonAccessService;
    constructor(lessonsService: LessonsService, lessonAccessService: LessonAccessService);
    getAccessMap(): Promise<Record<string, boolean>>;
    setAccess(lessonId: string, dto: UpdateLessonAccessDto): Promise<{
        updatedAt: Date;
        lessonId: string;
        isLocked: boolean;
    }>;
    findAll(featured?: string, categoryId?: string): Promise<({
        category: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            icon: string;
            iconColor: string;
            imageUrl: string | null;
            lessonCount: number;
            isPopular: boolean;
        } | null;
    } & {
        id: string;
        level: import("@prisma/client").$Enums.LessonLevel;
        createdAt: Date;
        description: string | null;
        duration: number;
        isFeatured: boolean;
        categoryId: string | null;
        title: string;
        audioUrl: string | null;
        videoUrl: string | null;
        thumbnailUrl: string | null;
        topic: string | null;
        isNew: boolean;
        isHot: boolean;
    })[]>;
    getMyStats(user: {
        id: string;
    }): Promise<{
        completedLessons: number;
        lessonsListened: number;
        hoursListened: number;
        streakDays: number;
        weeklyGoal: number;
        weeklyProgress: number;
    }>;
    getHistory(userId: string, status?: string): Promise<({
        lesson: {
            category: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                icon: string;
                iconColor: string;
                imageUrl: string | null;
                lessonCount: number;
                isPopular: boolean;
            } | null;
        } & {
            id: string;
            level: import("@prisma/client").$Enums.LessonLevel;
            createdAt: Date;
            description: string | null;
            duration: number;
            isFeatured: boolean;
            categoryId: string | null;
            title: string;
            audioUrl: string | null;
            videoUrl: string | null;
            thumbnailUrl: string | null;
            topic: string | null;
            isNew: boolean;
            isHot: boolean;
        };
    } & {
        status: import("@prisma/client").$Enums.HistoryStatus;
        id: string;
        userId: string;
        lessonId: string;
        progressPercentage: number;
        listenedSeconds: number;
        isFavorite: boolean;
        lastListenedAt: Date;
    })[]>;
    getHistoryStats(userId: string): Promise<{
        completedLessons: number;
        lessonsListened: number;
        hoursListened: number;
        streakDays: number;
        weeklyGoal: number;
        weeklyProgress: number;
    }>;
    findOne(id: string): Promise<({
        category: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            icon: string;
            iconColor: string;
            imageUrl: string | null;
            lessonCount: number;
            isPopular: boolean;
        } | null;
        transcripts: {
            id: string;
            orderIndex: number;
            lessonId: string;
            englishText: string;
            vietnamese: string;
            startTime: number;
            endTime: number;
        }[];
    } & {
        id: string;
        level: import("@prisma/client").$Enums.LessonLevel;
        createdAt: Date;
        description: string | null;
        duration: number;
        isFeatured: boolean;
        categoryId: string | null;
        title: string;
        audioUrl: string | null;
        videoUrl: string | null;
        thumbnailUrl: string | null;
        topic: string | null;
        isNew: boolean;
        isHot: boolean;
    }) | null>;
}
