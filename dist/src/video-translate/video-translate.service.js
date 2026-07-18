"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VideoTranslateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoTranslateService = exports.DUBBED_PIPELINE_VERSION = exports.DEFAULT_MAX_SECONDS_PREMIUM = exports.DEFAULT_MAX_SECONDS_FREE = exports.FREE_VIDEO_TRANSLATE_PER_DAY = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const openai_1 = __importStar(require("openai"));
const youtube_transcript_1 = require("youtube-transcript");
const prisma_service_1 = require("../prisma/prisma.service");
const youtube_util_1 = require("./youtube.util");
exports.FREE_VIDEO_TRANSLATE_PER_DAY = 3;
exports.DEFAULT_MAX_SECONDS_FREE = 480;
exports.DEFAULT_MAX_SECONDS_PREMIUM = 1200;
exports.DUBBED_PIPELINE_VERSION = 8;
const TRANSCRIPT_RULES = {
    minWordsPerCard: 4,
    pauseBreakSec: 0.5,
    shortFragmentMergeGapSec: 1.0,
    maxWordsPerCard: 18,
    maxUtteranceSec: 8,
};
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let VideoTranslateService = VideoTranslateService_1 = class VideoTranslateService {
    prisma;
    config;
    logger = new common_1.Logger(VideoTranslateService_1.name);
    openai = null;
    processing = new Set();
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        const apiKey = this.config.get('OPENAI_API_KEY');
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
        else {
            this.logger.warn('OPENAI_API_KEY chưa cấu hình — dịch video sẽ không chạy được');
        }
    }
    async getQuota(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { isPremium: true, premiumExpiresAt: true },
        });
        const isPremium = this.resolvePremium(user);
        const usage = await this.getTodayUsage(userId);
        return {
            used: usage,
            limit: exports.FREE_VIDEO_TRANSLATE_PER_DAY,
            remaining: isPremium
                ? null
                : Math.max(0, exports.FREE_VIDEO_TRANSLATE_PER_DAY - usage),
            isPremium,
            resetsAt: this.nextResetAt().toISOString(),
            maxSeconds: isPremium
                ? this.maxSecondsPremium()
                : this.maxSecondsFree(),
        };
    }
    async listJobs(userId) {
        const jobs = await this.prisma.videoTranslateJob.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return {
            jobs: jobs.map((job) => this.serializeJob(job)),
            quota: await this.getQuota(userId),
        };
    }
    async getJob(userId, jobId) {
        const job = await this.prisma.videoTranslateJob.findFirst({
            where: { id: jobId, userId },
        });
        if (!job)
            throw new common_1.NotFoundException('Không tìm thấy job dịch video');
        return {
            job: this.serializeJob(job),
            quota: await this.getQuota(userId),
        };
    }
    async resolveDubbedFilePath(userId, jobId) {
        const job = await this.prisma.videoTranslateJob.findFirst({
            where: { id: jobId, userId },
            select: { dubbedAudioUrl: true, status: true },
        });
        if (!job || job.status !== client_1.VideoTranslateStatus.READY || !job.dubbedAudioUrl) {
            return null;
        }
        const match = job.dubbedAudioUrl.match(/^\/media\/video-translate\/([^/]+)\/dubbed\.mp3$/);
        const folderId = match?.[1] ?? jobId;
        const filePath = (0, path_1.join)(process.cwd(), 'storage', 'video-translate', folderId, 'dubbed.mp3');
        return (0, fs_1.existsSync)(filePath) ? filePath : null;
    }
    async createJob(userId, rawUrl) {
        this.ensureOpenAi();
        const videoId = (0, youtube_util_1.extractYoutubeVideoId)(rawUrl);
        if (!videoId) {
            throw new common_1.BadRequestException('Link YouTube không hợp lệ. Dán URL dạng youtube.com/watch?v=... hoặc youtu.be/...');
        }
        const youtubeUrl = (0, youtube_util_1.youtubeWatchUrl)(videoId);
        const cached = await this.prisma.videoTranslateJob.findFirst({
            where: {
                youtubeVideoId: videoId,
                status: client_1.VideoTranslateStatus.READY,
                segmentsJson: { not: client_1.Prisma.DbNull },
                pipelineVersion: { gte: exports.DUBBED_PIPELINE_VERSION },
            },
            orderBy: { completedAt: 'desc' },
        });
        if (cached) {
            const cloned = await this.prisma.videoTranslateJob.create({
                data: {
                    userId,
                    youtubeVideoId: videoId,
                    youtubeUrl,
                    title: cached.title,
                    thumbnailUrl: cached.thumbnailUrl ?? (0, youtube_util_1.youtubeThumbnailUrl)(videoId),
                    durationSec: cached.durationSec,
                    status: client_1.VideoTranslateStatus.READY,
                    source: cached.source,
                    segmentsJson: cached.segmentsJson ?? client_1.Prisma.JsonNull,
                    dubbedAudioUrl: null,
                    pipelineVersion: cached.pipelineVersion,
                    fromCache: true,
                    completedAt: new Date(),
                },
            });
            return {
                job: this.serializeJob(cloned),
                quota: await this.getQuota(userId),
                fromCache: true,
            };
        }
        await this.assertAndReserveQuota(userId);
        let job;
        try {
            job = await this.prisma.videoTranslateJob.create({
                data: {
                    userId,
                    youtubeVideoId: videoId,
                    youtubeUrl,
                    thumbnailUrl: (0, youtube_util_1.youtubeThumbnailUrl)(videoId),
                    status: client_1.VideoTranslateStatus.PENDING,
                },
            });
        }
        catch (error) {
            await this.releaseQuotaReservation(userId);
            throw error;
        }
        void this.processJob(job.id).catch((error) => {
            this.logger.error(`Video translate job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`);
        });
        return {
            job: this.serializeJob(job),
            quota: await this.getQuota(userId),
            fromCache: false,
        };
    }
    async processJob(jobId) {
        if (this.processing.has(jobId))
            return;
        this.processing.add(jobId);
        const jobDir = (0, path_1.join)(process.cwd(), 'storage', 'video-translate', jobId);
        const workDir = (0, path_1.join)(jobDir, 'work');
        (0, fs_1.mkdirSync)(workDir, { recursive: true });
        try {
            const job = await this.prisma.videoTranslateJob.findUnique({
                where: { id: jobId },
            });
            if (!job)
                return;
            await this.prisma.videoTranslateJob.update({
                where: { id: jobId },
                data: { status: client_1.VideoTranslateStatus.PROCESSING, errorMessage: null },
            });
            const meta = await this.fetchVideoMeta(job.youtubeVideoId, job.youtubeUrl);
            const user = await this.prisma.user.findUniqueOrThrow({
                where: { id: job.userId },
                select: { isPremium: true, premiumExpiresAt: true },
            });
            const isPremium = this.resolvePremium(user);
            const maxSeconds = isPremium
                ? this.maxSecondsPremium()
                : this.maxSecondsFree();
            if (meta.durationSec > maxSeconds) {
                throw new common_1.BadRequestException(`Video dài ${Math.ceil(meta.durationSec / 60)} phút — tối đa ${Math.floor(maxSeconds / 60)} phút cho tài khoản ${isPremium ? 'Premium' : 'miễn phí'}.`);
            }
            await this.prisma.videoTranslateJob.update({
                where: { id: jobId },
                data: {
                    title: meta.title,
                    durationSec: meta.durationSec,
                    thumbnailUrl: meta.thumbnailUrl ?? (0, youtube_util_1.youtubeThumbnailUrl)(job.youtubeVideoId),
                },
            });
            const { segments: timed, source } = await this.getTimedTranscript(job.youtubeVideoId, job.youtubeUrl, workDir, meta.durationSec);
            const translated = await this.translateSegments(timed);
            await this.prisma.videoTranslateJob.update({
                where: { id: jobId },
                data: {
                    status: client_1.VideoTranslateStatus.READY,
                    source,
                    segmentsJson: translated,
                    dubbedAudioUrl: null,
                    pipelineVersion: exports.DUBBED_PIPELINE_VERSION,
                    completedAt: new Date(),
                    errorMessage: null,
                },
            });
        }
        catch (error) {
            const message = error instanceof common_1.BadRequestException
                ? typeof error.getResponse() === 'string'
                    ? error.getResponse()
                    : (error.getResponse().message ??
                        error.message)
                : error instanceof Error
                    ? error.message
                    : 'Xử lý video thất bại';
            await this.prisma.videoTranslateJob.update({
                where: { id: jobId },
                data: {
                    status: client_1.VideoTranslateStatus.FAILED,
                    errorMessage: message,
                },
            });
            const job = await this.prisma.videoTranslateJob.findUnique({
                where: { id: jobId },
                select: { userId: true },
            });
            if (job)
                await this.releaseQuotaReservation(job.userId);
        }
        finally {
            this.processing.delete(jobId);
            try {
                (0, fs_1.rmSync)(workDir, { recursive: true, force: true });
            }
            catch {
            }
        }
    }
    async getTimedTranscript(videoId, youtubeUrl, workDir, durationSec) {
        const captionSegments = await this.tryFetchCaptions(videoId, durationSec);
        if (captionSegments.length > 0) {
            return {
                segments: this.finalizeSegments(captionSegments, durationSec),
                source: 'captions',
            };
        }
        this.logger.log(`No captions for ${videoId} — using Whisper STT`);
        const audioPath = await this.downloadAudio(youtubeUrl, workDir);
        const whisperSegments = await this.transcribeWithWhisper(audioPath);
        const normalized = whisperSegments.map((seg) => ({
            start: seg.start,
            end: seg.end || Math.min(durationSec, seg.start + 4),
            en: seg.en,
        }));
        return {
            segments: this.finalizeSegments(normalized, durationSec),
            source: 'whisper',
        };
    }
    async tryFetchCaptions(videoId, durationSec) {
        try {
            let items = await (0, youtube_transcript_1.fetchTranscript)(videoId, { lang: 'en' });
            if (!items?.length) {
                items = await (0, youtube_transcript_1.fetchTranscript)(videoId);
            }
            if (!items?.length)
                return [];
            const maxOffset = Math.max(...items.map((item) => Number(item.offset) || 0));
            const unitIsMs = maxOffset > durationSec * 1.5 + 5;
            return items
                .map((item) => {
                const rawStart = Number(item.offset) || 0;
                const rawDur = Number(item.duration) || 0;
                const start = unitIsMs ? rawStart / 1000 : rawStart;
                const duration = unitIsMs ? rawDur / 1000 : rawDur;
                const en = this.cleanCaptionText(item.text);
                if (!en)
                    return null;
                const wordCount = en.split(/\s+/).filter(Boolean).length;
                const safeDur = duration > 0.12
                    ? duration
                    : Math.min(4, Math.max(0.45, 0.3 + wordCount * 0.25));
                return {
                    start: Number.isFinite(start) ? start : 0,
                    end: Number.isFinite(start + safeDur) ? start + safeDur : start + 2,
                    en,
                };
            })
                .filter((seg) => seg != null && seg.en.length > 0)
                .sort((a, b) => a.start - b.start || a.end - b.end);
        }
        catch (error) {
            this.logger.warn(`Caption fetch failed for ${videoId}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    cleanCaptionText(text) {
        return text
            .replace(/\[.*?\]/g, ' ')
            .replace(/\(.*?\)/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    finalizeSegments(segments, durationSec) {
        const sorted = [...segments].sort((a, b) => a.start - b.start || a.end - b.end);
        const collapsed = this.collapseRollingCaptions(sorted);
        const utterances = this.mergeIntoUtterances(collapsed);
        const glued = this.enforceMinWordsPerCard(utterances);
        const split = this.splitMultiSentence(glued);
        const repaired = this.enforceMinWordsPerCard(split);
        return this.alignSegmentWindows(repaired, durationSec).filter((seg) => seg.en.trim().length > 0);
    }
    wordCount(text) {
        return text.split(/\s+/).filter(Boolean).length;
    }
    endsUtterance(text) {
        return /[.!?…]["')\]]?\s*$/.test(text.trim());
    }
    joinSegmentText(left, right) {
        const lastLower = left.toLowerCase();
        const nextLower = right.toLowerCase();
        if (nextLower.startsWith(lastLower) || nextLower.includes(lastLower)) {
            return right;
        }
        if (lastLower.includes(nextLower) && right.length <= left.length) {
            return left;
        }
        return `${left} ${right}`.replace(/\s+/g, ' ').trim();
    }
    mergeTwoSegments(a, b) {
        const aWords = this.wordCount(a.en);
        const bWords = this.wordCount(b.en);
        const reorder = this.endsUtterance(a.en) &&
            aWords <= 4 &&
            bWords <= 4 &&
            /^[a-z]/.test(a.en.trim()) &&
            /^[A-Z]/.test(b.en.trim());
        return {
            start: Math.min(a.start, b.start),
            end: Math.max(a.end, b.end),
            en: reorder
                ? `${b.en.replace(/[.!?…]+$/, '')} ${a.en}`.replace(/\s+/g, ' ').trim()
                : this.joinSegmentText(a.en, b.en),
        };
    }
    collapseRollingCaptions(segments) {
        const out = [];
        for (const seg of segments) {
            const last = out[out.length - 1];
            if (!last) {
                out.push({ ...seg });
                continue;
            }
            const lastLower = last.en.toLowerCase();
            const nextLower = seg.en.toLowerCase();
            const overlaps = seg.start <= last.end + 0.25;
            const isExtension = nextLower.startsWith(lastLower) ||
                nextLower.includes(lastLower) ||
                lastLower.includes(nextLower);
            if (overlaps && isExtension) {
                last.end = Math.max(last.end, seg.end);
                if (seg.en.length >= last.en.length)
                    last.en = seg.en;
                continue;
            }
            out.push({ ...seg });
        }
        return out;
    }
    mergeIntoUtterances(segments) {
        const { minWordsPerCard, pauseBreakSec, shortFragmentMergeGapSec, maxWordsPerCard, maxUtteranceSec, } = TRANSCRIPT_RULES;
        const merged = [];
        for (const seg of segments) {
            const last = merged[merged.length - 1];
            if (!last) {
                merged.push({ ...seg });
                continue;
            }
            const gap = seg.start - last.end;
            const lastWords = this.wordCount(last.en);
            const words = this.wordCount(seg.en);
            const combinedWords = lastWords + words;
            const combinedDur = Math.max(seg.end, last.end) - last.start;
            const lastEnded = this.endsUtterance(last.en);
            const lastCompleteEnough = lastWords >= minWordsPerCard || (lastEnded && lastWords >= 3);
            const lastTooShort = lastWords < minWordsPerCard;
            const canFit = combinedWords <= maxWordsPerCard && combinedDur <= maxUtteranceSec;
            if (lastCompleteEnough && gap >= pauseBreakSec) {
                if (lastEnded &&
                    lastWords <= 4 &&
                    words <= 4 &&
                    gap < shortFragmentMergeGapSec &&
                    /^[a-z]/.test(last.en.trim()) &&
                    /^[A-Z]/.test(seg.en.trim())) {
                    const joined = this.mergeTwoSegments(last, seg);
                    last.start = joined.start;
                    last.end = joined.end;
                    last.en = joined.en;
                    continue;
                }
                merged.push({ ...seg });
                continue;
            }
            const mustGlueShort = lastTooShort && gap < shortFragmentMergeGapSec && canFit;
            const continueSameSentence = canFit &&
                (mustGlueShort ||
                    (!lastCompleteEnough && gap < pauseBreakSec) ||
                    (gap < pauseBreakSec && !lastEnded));
            if (continueSameSentence) {
                const joined = this.mergeTwoSegments(last, seg);
                last.start = joined.start;
                last.end = joined.end;
                last.en = joined.en;
                continue;
            }
            merged.push({ ...seg });
        }
        return merged;
    }
    enforceMinWordsPerCard(segments) {
        const { minWordsPerCard, pauseBreakSec, shortFragmentMergeGapSec, maxWordsPerCard, } = TRANSCRIPT_RULES;
        let merged = [...segments.map((seg) => ({ ...seg }))];
        const forward = [];
        for (const seg of merged) {
            const last = forward[forward.length - 1];
            if (!last) {
                forward.push(seg);
                continue;
            }
            const gap = seg.start - last.end;
            const lastWords = this.wordCount(last.en);
            const words = this.wordCount(seg.en);
            const lastCompleteEnough = lastWords >= minWordsPerCard ||
                (this.endsUtterance(last.en) && lastWords >= 3);
            if (lastCompleteEnough && gap >= pauseBreakSec) {
                forward.push(seg);
                continue;
            }
            const close = gap < shortFragmentMergeGapSec || seg.start - last.start < 5;
            const needGlue = close &&
                lastWords + words <= maxWordsPerCard &&
                (lastWords < minWordsPerCard ||
                    words < minWordsPerCard ||
                    (!this.endsUtterance(last.en) && lastWords < minWordsPerCard + 2));
            if (needGlue) {
                const joined = this.mergeTwoSegments(last, seg);
                last.start = joined.start;
                last.end = joined.end;
                last.en = joined.en;
            }
            else {
                forward.push(seg);
            }
        }
        merged = [];
        for (let i = 0; i < forward.length; i += 1) {
            const cur = forward[i];
            const next = forward[i + 1];
            if (next &&
                this.wordCount(cur.en) < minWordsPerCard &&
                !this.endsUtterance(cur.en) &&
                next.start - cur.end < shortFragmentMergeGapSec) {
                const joined = this.mergeTwoSegments(cur, next);
                next.start = joined.start;
                next.end = joined.end;
                next.en = joined.en;
                continue;
            }
            merged.push(cur);
        }
        return merged;
    }
    splitMultiSentence(segments) {
        const { minWordsPerCard } = TRANSCRIPT_RULES;
        const out = [];
        for (const seg of segments) {
            const parts = seg.en
                .split(/(?<=[.!?…])\s+/)
                .map((part) => part.trim())
                .filter(Boolean);
            if (parts.length <= 1 ||
                parts.some((part) => this.wordCount(part) < minWordsPerCard)) {
                out.push({ ...seg });
                continue;
            }
            const totalDur = Math.max(0.45, seg.end - seg.start);
            const totalChars = parts.reduce((sum, part) => sum + part.length, 0) || 1;
            let cursor = seg.start;
            parts.forEach((part, index) => {
                const share = part.length / totalChars;
                const dur = Math.max(0.4, totalDur * share);
                const end = index === parts.length - 1 ? seg.end : Math.min(seg.end, cursor + dur);
                out.push({ start: cursor, end, en: part });
                cursor = end;
            });
        }
        return out;
    }
    alignSegmentWindows(segments, durationSec) {
        const sorted = [...segments].sort((a, b) => a.start - b.start || a.end - b.end);
        return sorted.map((seg, index) => {
            const isLast = index >= sorted.length - 1;
            const nextStart = isLast
                ? Math.max(durationSec, seg.end + 0.8)
                : sorted[index + 1].start;
            const words = this.wordCount(seg.en);
            const minEnd = seg.start + Math.min(6.5, 0.4 + words * 0.3);
            let end = Math.max(seg.end, minEnd);
            if (!isLast) {
                const gap = nextStart - seg.end;
                if (gap <= 2.5) {
                    end = Math.max(seg.start + 0.35, nextStart - 0.04);
                }
                else {
                    end = Math.min(Math.max(seg.end, minEnd), nextStart - 0.04);
                }
            }
            return {
                ...seg,
                start: Math.max(0, seg.start),
                end: Math.max(seg.start + 0.35, end),
            };
        });
    }
    async translateSegments(segments) {
        this.ensureOpenAi();
        const out = [];
        const batchSize = 12;
        for (let i = 0; i < segments.length; i += batchSize) {
            const batch = segments.slice(i, i + batchSize);
            const payload = batch.map((seg, idx) => ({
                i: idx,
                en: seg.en,
            }));
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You translate English video transcript segments into concise natural Vietnamese for learners. Keep meaning, prefer shorter phrasing so spoken length stays close to English. Return JSON: {"items":[{"i":0,"vi":"..."}]}. No explanations.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({ items: payload }),
                    },
                ],
            });
            const raw = completion.choices[0]?.message?.content ?? '{}';
            let map = new Map();
            try {
                const parsed = JSON.parse(raw);
                for (const item of parsed.items ?? []) {
                    if (typeof item?.vi === 'string')
                        map.set(item.i, item.vi.trim());
                }
            }
            catch {
                map = new Map();
            }
            for (let idx = 0; idx < batch.length; idx += 1) {
                const seg = batch[idx];
                out.push({
                    start: seg.start,
                    end: seg.end,
                    en: seg.en,
                    vi: map.get(idx) || (await this.translateOne(seg.en)),
                });
            }
        }
        return out;
    }
    async translateOne(text) {
        this.ensureOpenAi();
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: 'Translate English into natural Vietnamese. Return only the translation.',
                },
                { role: 'user', content: text },
            ],
        });
        return completion.choices[0]?.message?.content?.trim() || text;
    }
    async buildDubbedAudio(jobId, jobDir, workDir, segments, durationSec) {
        const partsDir = (0, path_1.join)(workDir, 'parts');
        (0, fs_1.mkdirSync)(partsDir, { recursive: true });
        const partFiles = [];
        for (let i = 0; i < segments.length; i += 1) {
            const seg = segments[i];
            if (!seg.vi.trim())
                continue;
            const nextStart = segments[i + 1]?.start ?? durationSec;
            const windowEnd = Math.max(seg.start + 0.35, Math.min(seg.end + 0.15, nextStart - 0.04));
            const targetDur = Math.max(0.35, windowEnd - seg.start);
            const buffer = await this.synthesizeVietnamese(seg.vi);
            const rawPath = (0, path_1.join)(partsDir, `raw-${String(i).padStart(3, '0')}.mp3`);
            const fittedPath = (0, path_1.join)(partsDir, `fit-${String(i).padStart(3, '0')}.mp3`);
            (0, fs_1.writeFileSync)(rawPath, buffer);
            await this.fitSpeechToWindow(rawPath, fittedPath, targetDur);
            partFiles.push({
                path: fittedPath,
                delayMs: Math.max(0, Math.round(seg.start * 1000)),
            });
        }
        if (partFiles.length === 0) {
            throw new common_1.BadRequestException('Không tạo được audio tiếng Việt từ transcript');
        }
        (0, fs_1.mkdirSync)(jobDir, { recursive: true });
        const outPath = (0, path_1.join)(jobDir, 'dubbed.mp3');
        const silencePath = (0, path_1.join)(workDir, 'silence.mp3');
        const totalSec = Math.max(durationSec, Math.ceil(segments.at(-1)?.end ?? 1) + 1);
        await this.runFfmpeg([
            '-y',
            '-f',
            'lavfi',
            '-i',
            `anullsrc=r=44100:cl=mono`,
            '-t',
            String(totalSec),
            '-q:a',
            '9',
            silencePath,
        ]);
        let currentBase = silencePath;
        const batchSize = 8;
        for (let i = 0; i < partFiles.length; i += batchSize) {
            const batch = partFiles.slice(i, i + batchSize);
            const mixedPath = (0, path_1.join)(workDir, `mix-${i}.mp3`);
            const inputs = ['-y', '-i', currentBase];
            for (const part of batch) {
                inputs.push('-i', part.path);
            }
            const filters = [];
            const mixInputs = ['[0:a]'];
            batch.forEach((part, idx) => {
                const label = `a${idx}`;
                filters.push(`[${idx + 1}:a]adelay=${part.delayMs}|${part.delayMs},volume=1.15[${label}]`);
                mixInputs.push(`[${label}]`);
            });
            filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0[out]`);
            await this.runFfmpeg([
                ...inputs,
                '-filter_complex',
                filters.join(';'),
                '-map',
                '[out]',
                '-q:a',
                '4',
                mixedPath,
            ]);
            currentBase = mixedPath;
        }
        (0, fs_1.writeFileSync)(outPath, (0, fs_1.readFileSync)(currentBase));
        return `/media/video-translate/${jobId}/dubbed.mp3`;
    }
    async fitSpeechToWindow(inputPath, outputPath, targetDur) {
        const rawDur = await this.probeDurationSec(inputPath);
        if (!Number.isFinite(rawDur) || rawDur <= 0.05) {
            (0, fs_1.writeFileSync)(outputPath, (0, fs_1.readFileSync)(inputPath));
            return;
        }
        let speed = rawDur / targetDur;
        speed = Math.min(1.75, Math.max(0.8, speed));
        const atempo = this.buildAtempoFilter(speed);
        const fadeStart = Math.max(0, targetDur - 0.08);
        const filter = [
            atempo,
            `apad=pad_dur=${targetDur.toFixed(3)}`,
            `atrim=0:${targetDur.toFixed(3)}`,
            `afade=t=out:st=${fadeStart.toFixed(3)}:d=0.08`,
        ].join(',');
        await this.runFfmpeg([
            '-y',
            '-i',
            inputPath,
            '-af',
            filter,
            '-q:a',
            '4',
            outputPath,
        ]);
    }
    buildAtempoFilter(speed) {
        const parts = [];
        let remaining = speed;
        while (remaining > 2) {
            parts.push('atempo=2.0');
            remaining /= 2;
        }
        while (remaining < 0.5) {
            parts.push('atempo=0.5');
            remaining /= 0.5;
        }
        parts.push(`atempo=${remaining.toFixed(4)}`);
        return parts.join(',');
    }
    async probeDurationSec(filePath) {
        const ffmpeg = this.resolveFfmpegPath();
        try {
            const { stderr } = await execFileAsync(ffmpeg, ['-i', filePath, '-f', 'null', '-'], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
            const match = String(stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
            if (!match)
                return 0;
            const h = Number(match[1]);
            const m = Number(match[2]);
            const s = Number(match[3]);
            return h * 3600 + m * 60 + s;
        }
        catch (error) {
            const stderr = error && typeof error === 'object' && 'stderr' in error
                ? String(error.stderr ?? '')
                : '';
            const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
            if (!match)
                return 0;
            return (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
        }
    }
    async synthesizeVietnamese(text) {
        const elevenKey = this.config.get('ELEVENLABS_API_KEY')?.trim();
        const voiceId = this.config.get('ELEVENLABS_VOICE_ID')?.trim();
        if (elevenKey && voiceId) {
            return this.synthesizeElevenLabs(text, elevenKey, voiceId);
        }
        return this.synthesizeOpenAiTts(text);
    }
    async synthesizeElevenLabs(text, apiKey, voiceId) {
        const model = this.config.get('ELEVENLABS_MODEL_ID')?.trim() ||
            'eleven_turbo_v2_5';
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: model,
                voice_settings: {
                    stability: 0.45,
                    similarity_boost: 0.75,
                    style: 0.1,
                    use_speaker_boost: true,
                },
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new common_1.ServiceUnavailableException(`ElevenLabs TTS lỗi (${res.status}): ${body.slice(0, 200)}`);
        }
        return Buffer.from(await res.arrayBuffer());
    }
    async synthesizeOpenAiTts(text) {
        this.ensureOpenAi();
        try {
            const speech = await this.openai.audio.speech.create({
                model: 'gpt-4o-mini-tts',
                voice: 'alloy',
                input: text,
                instructions: 'Speak clear Vietnamese at a natural conversational pace.',
                response_format: 'mp3',
            });
            return Buffer.from(await speech.arrayBuffer());
        }
        catch (error) {
            const speech = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
                response_format: 'mp3',
            });
            this.logger.warn(`gpt-4o-mini-tts unavailable, fell back to tts-1: ${error instanceof Error ? error.message : String(error)}`);
            return Buffer.from(await speech.arrayBuffer());
        }
    }
    async downloadAudio(youtubeUrl, workDir) {
        const ytDlp = this.resolveYtDlpPath();
        const outTemplate = (0, path_1.join)(workDir, 'audio.%(ext)s');
        try {
            await execFileAsync(ytDlp, [
                '-f',
                'bestaudio/best',
                '-x',
                '--audio-format',
                'mp3',
                '--audio-quality',
                '5',
                '--no-playlist',
                '-o',
                outTemplate,
                youtubeUrl,
            ], { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 });
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw new common_1.ServiceUnavailableException(`Không tải được audio YouTube. Kiểm tra yt-dlp/ffmpeg. Chi tiết: ${detail.slice(0, 240)}`);
        }
        const files = (0, fs_1.readdirSync)(workDir).filter((name) => /^audio\.(mp3|m4a|webm|opus|wav)$/i.test(name));
        if (!files.length) {
            throw new common_1.ServiceUnavailableException('Không tìm thấy file audio sau khi tải');
        }
        return (0, path_1.join)(workDir, files[0]);
    }
    async transcribeWithWhisper(audioPath) {
        this.ensureOpenAi();
        const buffer = (0, fs_1.readFileSync)(audioPath);
        const file = await (0, openai_1.toFile)(buffer, 'audio.mp3', { type: 'audio/mpeg' });
        const result = await this.openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'en',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
        });
        const segments = result.segments ?? [];
        if (!segments.length && result.text) {
            return [
                {
                    start: 0,
                    end: 4,
                    en: String(result.text).trim(),
                },
            ];
        }
        return segments
            .map((seg) => ({
            start: Number(seg.start) || 0,
            end: Number(seg.end) || (Number(seg.start) || 0) + 2,
            en: this.cleanCaptionText(String(seg.text ?? '')),
        }))
            .filter((seg) => seg.en.length > 0);
    }
    async fetchVideoMeta(videoId, youtubeUrl) {
        try {
            const ytDlp = this.resolveYtDlpPath();
            const { stdout } = await execFileAsync(ytDlp, ['--dump-json', '--no-playlist', youtubeUrl], { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
            const data = JSON.parse(stdout);
            return {
                title: data.title?.trim() || `YouTube ${videoId}`,
                durationSec: Math.max(1, Math.round(Number(data.duration) || 1)),
                thumbnailUrl: data.thumbnail || (0, youtube_util_1.youtubeThumbnailUrl)(videoId),
            };
        }
        catch {
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`);
                if (res.ok) {
                    const data = (await res.json());
                    return {
                        title: data.title?.trim() || `YouTube ${videoId}`,
                        durationSec: this.maxSecondsFree(),
                        thumbnailUrl: data.thumbnail_url || (0, youtube_util_1.youtubeThumbnailUrl)(videoId),
                    };
                }
            }
            catch {
            }
            return {
                title: `YouTube ${videoId}`,
                durationSec: this.maxSecondsFree(),
                thumbnailUrl: (0, youtube_util_1.youtubeThumbnailUrl)(videoId),
            };
        }
    }
    resolveYtDlpPath() {
        const configured = this.config.get('YT_DLP_PATH')?.trim();
        if (configured && (0, fs_1.existsSync)(configured))
            return configured;
        const local = (0, path_1.join)(process.cwd(), 'tools', 'yt-dlp.exe');
        if ((0, fs_1.existsSync)(local))
            return local;
        const unixLocal = (0, path_1.join)(process.cwd(), 'tools', 'yt-dlp');
        if ((0, fs_1.existsSync)(unixLocal))
            return unixLocal;
        return 'yt-dlp';
    }
    resolveFfmpegPath() {
        const configured = this.config.get('FFMPEG_PATH')?.trim();
        if (configured && (0, fs_1.existsSync)(configured))
            return configured;
        return 'ffmpeg';
    }
    async runFfmpeg(args) {
        const ffmpeg = this.resolveFfmpegPath();
        try {
            await execFileAsync(ffmpeg, args, {
                timeout: 180_000,
                maxBuffer: 10 * 1024 * 1024,
            });
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw new common_1.ServiceUnavailableException(`ffmpeg lỗi: ${detail.slice(0, 240)}`);
        }
    }
    serializeJob(job) {
        return {
            id: job.id,
            youtubeVideoId: job.youtubeVideoId,
            youtubeUrl: job.youtubeUrl,
            title: job.title,
            thumbnailUrl: job.thumbnailUrl,
            durationSec: job.durationSec,
            status: job.status,
            source: job.source,
            errorMessage: job.errorMessage,
            segments: this.parseSegments(job.segmentsJson),
            dubbedAudioUrl: job.dubbedAudioUrl,
            pipelineVersion: job.pipelineVersion ?? 1,
            fromCache: job.fromCache,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? null,
        };
    }
    parseSegments(value) {
        if (!value || !Array.isArray(value))
            return [];
        return value
            .map((item) => {
            if (!item || typeof item !== 'object')
                return null;
            const row = item;
            const start = Number(row.start);
            const end = Number(row.end);
            const en = typeof row.en === 'string' ? row.en : '';
            const vi = typeof row.vi === 'string' ? row.vi : '';
            if (!Number.isFinite(start) || !en)
                return null;
            return {
                start,
                end: Number.isFinite(end) ? end : start + 2,
                en,
                vi,
            };
        })
            .filter((item) => item != null);
    }
    resolvePremium(user) {
        if (!user.isPremium)
            return false;
        if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
            return false;
        }
        return true;
    }
    usageDate() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
    nextResetAt() {
        const date = this.usageDate();
        date.setUTCDate(date.getUTCDate() + 1);
        return date;
    }
    maxSecondsFree() {
        const raw = Number(this.config.get('VIDEO_TRANSLATE_MAX_SECONDS_FREE'));
        return Number.isFinite(raw) && raw > 0 ? raw : exports.DEFAULT_MAX_SECONDS_FREE;
    }
    maxSecondsPremium() {
        const raw = Number(this.config.get('VIDEO_TRANSLATE_MAX_SECONDS_PREMIUM'));
        return Number.isFinite(raw) && raw > 0 ? raw : exports.DEFAULT_MAX_SECONDS_PREMIUM;
    }
    async getTodayUsage(userId) {
        const usage = await this.prisma.videoTranslateDailyUsage.findUnique({
            where: {
                userId_usageDate: {
                    userId,
                    usageDate: this.usageDate(),
                },
            },
            select: { videoCount: true },
        });
        return usage?.videoCount ?? 0;
    }
    async assertAndReserveQuota(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { isPremium: true, premiumExpiresAt: true },
        });
        if (this.resolvePremium(user))
            return;
        const usageDate = this.usageDate();
        const reserved = await this.prisma.$transaction(async (tx) => {
            await tx.videoTranslateDailyUsage.upsert({
                where: { userId_usageDate: { userId, usageDate } },
                create: { userId, usageDate, videoCount: 0 },
                update: {},
            });
            const updated = await tx.$queryRaw `
        UPDATE video_translate_daily_usage
        SET video_count = video_count + 1, updated_at = NOW()
        WHERE user_id = ${userId}
          AND usage_date = ${usageDate}
          AND video_count < ${exports.FREE_VIDEO_TRANSLATE_PER_DAY}
        RETURNING video_count
      `;
            return updated[0] ?? null;
        });
        if (!reserved) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                message: 'Bạn đã hết 3 video miễn phí hôm nay. Nâng cấp Premium để dịch không giới hạn.',
                code: 'VIDEO_TRANSLATE_QUOTA_EXCEEDED',
            });
        }
    }
    async releaseQuotaReservation(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isPremium: true, premiumExpiresAt: true },
        });
        if (!user || this.resolvePremium(user))
            return;
        const usageDate = this.usageDate();
        await this.prisma.$executeRaw `
      UPDATE video_translate_daily_usage
      SET video_count = GREATEST(video_count - 1, 0), updated_at = NOW()
      WHERE user_id = ${userId} AND usage_date = ${usageDate}
    `;
    }
    ensureOpenAi() {
        if (!this.openai) {
            throw new common_1.ServiceUnavailableException('OPENAI_API_KEY chưa cấu hình — không thể dịch video');
        }
    }
};
exports.VideoTranslateService = VideoTranslateService;
exports.VideoTranslateService = VideoTranslateService = VideoTranslateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], VideoTranslateService);
//# sourceMappingURL=video-translate.service.js.map