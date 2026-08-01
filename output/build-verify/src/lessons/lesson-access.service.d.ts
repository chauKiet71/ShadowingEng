import { PrismaService } from '../prisma/prisma.service';
export declare class LessonAccessService {
    private prisma;
    constructor(prisma: PrismaService);
    getAccessMap(): Promise<Record<string, boolean>>;
    getLockedLessonIds(): Promise<string[]>;
    setLocked(lessonId: string, isLocked: boolean): Promise<{
        updatedAt: Date;
        lessonId: string;
        isLocked: boolean;
    }>;
}
