import { GuestIdentityService } from '../auth/guest-identity.service';
import { VideoTranslateService } from './video-translate.service';
interface UploadedMediaFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}
export declare class VideoTranslateController {
    private readonly videoTranslateService;
    private readonly guestIdentity;
    constructor(videoTranslateService: VideoTranslateService, guestIdentity: GuestIdentityService);
    getQuota(user: {
        id: string;
    } | null, guestToken?: string): Promise<{
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
        resetsAt: string;
        maxSeconds: number;
    }>;
    listJobs(user: {
        id: string;
    } | null, guestToken?: string): Promise<{
        jobs: {
            id: string;
            youtubeVideoId: string | null;
            youtubeUrl: string | null;
            originalFilename: string | null;
            mediaUrl: string | null;
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
    } | null, guestToken: string | undefined, id: string): Promise<{
        job: {
            id: string;
            youtubeVideoId: string | null;
            youtubeUrl: string | null;
            originalFilename: string | null;
            mediaUrl: string | null;
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
    } | null, guestToken: string | undefined, file?: UploadedMediaFile): Promise<{
        job: {
            id: string;
            youtubeVideoId: string | null;
            youtubeUrl: string | null;
            originalFilename: string | null;
            mediaUrl: string | null;
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
    } | null, guestToken: string | undefined, id: string): Promise<{
        deleted: boolean;
    }>;
}
export {};
