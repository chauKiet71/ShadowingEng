import { CreateVideoTranslateDto } from './dto/create-video-translate.dto';
import { VideoTranslateService } from './video-translate.service';
export declare class VideoTranslateController {
    private readonly videoTranslateService;
    constructor(videoTranslateService: VideoTranslateService);
    getQuota(user: {
        id: string;
    }): Promise<{
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
        resetsAt: string;
        maxSeconds: number;
    }>;
    listJobs(user: {
        id: string;
    }): Promise<{
        jobs: {
            id: string;
            youtubeVideoId: string;
            youtubeUrl: string;
            title: string | null;
            thumbnailUrl: string | null;
            durationSec: number | null;
            status: import("@prisma/client").$Enums.VideoTranslateStatus;
            source: string | null;
            errorMessage: string | null;
            segments: import("./video-translate.service").VideoSegment[];
            dubbedAudioUrl: string | null;
            pipelineVersion: number;
            fromCache: boolean;
            createdAt: string;
            updatedAt: string;
            completedAt: string | null;
        }[];
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
            maxSeconds: number;
        };
    }>;
    getJob(user: {
        id: string;
    }, id: string): Promise<{
        job: {
            id: string;
            youtubeVideoId: string;
            youtubeUrl: string;
            title: string | null;
            thumbnailUrl: string | null;
            durationSec: number | null;
            status: import("@prisma/client").$Enums.VideoTranslateStatus;
            source: string | null;
            errorMessage: string | null;
            segments: import("./video-translate.service").VideoSegment[];
            dubbedAudioUrl: string | null;
            pipelineVersion: number;
            fromCache: boolean;
            createdAt: string;
            updatedAt: string;
            completedAt: string | null;
        };
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
            maxSeconds: number;
        };
    }>;
    createJob(user: {
        id: string;
    }, dto: CreateVideoTranslateDto): Promise<{
        job: {
            id: string;
            youtubeVideoId: string;
            youtubeUrl: string;
            title: string | null;
            thumbnailUrl: string | null;
            durationSec: number | null;
            status: import("@prisma/client").$Enums.VideoTranslateStatus;
            source: string | null;
            errorMessage: string | null;
            segments: import("./video-translate.service").VideoSegment[];
            dubbedAudioUrl: string | null;
            pipelineVersion: number;
            fromCache: boolean;
            createdAt: string;
            updatedAt: string;
            completedAt: string | null;
        };
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
            maxSeconds: number;
        };
        fromCache: boolean;
    }>;
    deleteJob(user: {
        id: string;
    }, id: string): Promise<{
        deleted: boolean;
    }>;
}
