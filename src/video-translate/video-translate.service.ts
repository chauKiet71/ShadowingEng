import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, VideoTranslateStatus } from '@prisma/client';
import { execFile } from 'child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import ffmpegStaticPath from 'ffmpeg-static';
import OpenAI from 'openai';
import { fetchTranscript } from 'youtube-transcript';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractYoutubeVideoId,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from './youtube.util';

export const FREE_VIDEO_TRANSLATE_PER_DAY = 3;
export const DEFAULT_MAX_SECONDS_FREE = 600;
export const DEFAULT_MAX_SECONDS_PREMIUM = 1200;
const DEFAULT_TRANSLATION_BATCH_SIZE = 24;
const DEFAULT_TRANSLATION_CONCURRENCY = 3;
/** Bump when processing pipeline changes — old cache bị bỏ qua */
export const DUBBED_PIPELINE_VERSION = 13;

/**
 * Quy tắc tạo transcript: mỗi thẻ = một câu nói tự nhiên.
 * Ví dụ hợp lệ: "Let me check."
 * Ví dụ cấm: tách "Let" và "me check." thành 2 thẻ.
 *
 * Cắt thẻ mới khi đã hết câu hoặc có khoảng nghỉ ≥ 0.5s.
 */
const TRANSCRIPT_RULES = {
  /** Khoảng nghỉ từ mức này trở lên luôn là ranh giới mới (giây). */
  pauseBreakSec: 0.5,
  /** Timestamp từ caption/audio thường được làm tròn đến mili giây. */
  timestampEpsilonSec: 0.001,
} as const;

const execFileAsync = promisify(execFile);

type CommandExecutionError = Error & {
  stderr?: string | Buffer;
  stdout?: string | Buffer;
};

export type VideoWordTiming = {
  text: string;
  start: number;
  end: number;
};

type TimedEnglishSegment = {
  start: number;
  end: number;
  en: string;
  words?: VideoWordTiming[];
};

type RawEnglishWordTiming = {
  start: number;
  end: number;
  en: string;
};

type CaptionTranscript = {
  segments: TimedEnglishSegment[];
  words: RawEnglishWordTiming[];
};

export type VideoSegment = TimedEnglishSegment & {
  vi: string;
};

@Injectable()
export class VideoTranslateService {
  private readonly logger = new Logger(VideoTranslateService.name);
  private openai: OpenAI | null = null;
  private readonly processing = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY chưa cấu hình — dịch video sẽ không chạy được',
      );
    }
  }

  async getQuota(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    });
    const isPremium = this.resolvePremium(user);
    const usage = await this.getTodayUsage(userId);

    return {
      used: usage,
      limit: FREE_VIDEO_TRANSLATE_PER_DAY,
      remaining: isPremium
        ? null
        : Math.max(0, FREE_VIDEO_TRANSLATE_PER_DAY - usage),
      isPremium,
      resetsAt: this.nextResetAt().toISOString(),
      maxSeconds: isPremium ? this.maxSecondsPremium() : this.maxSecondsFree(),
    };
  }

  async listJobs(userId: string) {
    const jobs = await this.prisma.videoTranslateJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const repairedJobs = await Promise.all(
      jobs.map((job) => this.repairLegacyYoutubeDuration(job)),
    );
    return {
      jobs: repairedJobs.map((job) => this.serializeJob(job)),
      quota: await this.getQuota(userId),
    };
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.prisma.videoTranslateJob.findFirst({
      where: { id: jobId, userId },
    });
    if (!job) throw new NotFoundException('Không tìm thấy job dịch video');
    return {
      job: this.serializeJob(job),
      quota: await this.getQuota(userId),
    };
  }

  async deleteJob(userId: string, jobId: string) {
    const job = await this.prisma.videoTranslateJob.findFirst({
      where: { id: jobId, userId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Không tìm thấy job dịch video');

    await this.prisma.videoTranslateJob.delete({
      where: { id: job.id },
    });

    try {
      rmSync(join(process.cwd(), 'storage', 'video-translate', job.id), {
        recursive: true,
        force: true,
      });
    } catch {
      // ignore cleanup errors
    }

    return { deleted: true };
  }

  async resolveDubbedFilePath(userId: string, jobId: string) {
    const job = await this.prisma.videoTranslateJob.findFirst({
      where: { id: jobId, userId },
      select: { dubbedAudioUrl: true, status: true },
    });
    if (
      !job ||
      job.status !== VideoTranslateStatus.READY ||
      !job.dubbedAudioUrl
    ) {
      return null;
    }

    const match = job.dubbedAudioUrl.match(
      /^\/media\/video-translate\/([^/]+)\/dubbed\.mp3$/,
    );
    const folderId = match?.[1] ?? jobId;
    const filePath = join(
      process.cwd(),
      'storage',
      'video-translate',
      folderId,
      'dubbed.mp3',
    );
    return existsSync(filePath) ? filePath : null;
  }

  async createJobFromUpload(
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype?: string;
      size?: number;
    },
  ) {
    this.ensureOpenAi();

    const originalName = String(file.originalname || 'video').trim() || 'video';
    const ext = this.resolveUploadExtension(originalName, file.mimetype);
    if (!ext) {
      throw new BadRequestException(
        'Định dạng không hỗ trợ. Hãy dùng mp4, webm, mov, mkv, mp3, m4a hoặc wav.',
      );
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('File tải lên rỗng');
    }
    if (file.buffer.length > 120 * 1024 * 1024) {
      throw new BadRequestException('File tối đa 120MB');
    }

    await this.assertAndReserveQuota(userId);

    const title = this.titleFromFilename(originalName);
    let job;
    try {
      job = await this.prisma.videoTranslateJob.create({
        data: {
          userId,
          youtubeVideoId: null,
          youtubeUrl: null,
          originalFilename: originalName.slice(0, 240),
          title,
          status: VideoTranslateStatus.PENDING,
          pipelineVersion: DUBBED_PIPELINE_VERSION,
        },
      });
    } catch (error) {
      await this.releaseQuotaReservation(userId);
      throw error;
    }

    const jobDir = join(process.cwd(), 'storage', 'video-translate', job.id);
    mkdirSync(jobDir, { recursive: true });
    const sourceName = `source.${ext}`;
    const sourcePath = join(jobDir, sourceName);
    writeFileSync(sourcePath, file.buffer);
    const mediaUrl = `/media/video-translate/${job.id}/${sourceName}`;

    await this.prisma.videoTranslateJob.update({
      where: { id: job.id },
      data: { mediaUrl },
    });
    job = { ...job, mediaUrl };

    void this.processJob(job.id).catch((error) => {
      this.logger.error(
        `Video translate job ${job.id} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return {
      job: this.serializeJob(job),
      quota: await this.getQuota(userId),
      fromCache: false,
    };
  }

  async createJob(userId: string, rawUrl: string) {
    const videoId = extractYoutubeVideoId(rawUrl);
    if (!videoId) {
      throw new BadRequestException(
        'Link YouTube không hợp lệ. Hãy dùng link youtube.com/watch?v=..., youtu.be/... hoặc YouTube Shorts.',
      );
    }

    const youtubeUrl = youtubeWatchUrl(videoId);
    const cached = await this.prisma.videoTranslateJob.findFirst({
      where: {
        youtubeVideoId: videoId,
        status: VideoTranslateStatus.READY,
        segmentsJson: { not: Prisma.DbNull },
        pipelineVersion: { gte: DUBBED_PIPELINE_VERSION },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (cached) {
      const repairedCached = await this.repairLegacyYoutubeDuration(cached);
      const cloned = await this.prisma.videoTranslateJob.create({
        data: {
          userId,
          youtubeVideoId: videoId,
          youtubeUrl,
          title: repairedCached.title,
          thumbnailUrl:
            repairedCached.thumbnailUrl ?? youtubeThumbnailUrl(videoId),
          durationSec: repairedCached.durationSec,
          status: VideoTranslateStatus.READY,
          source: repairedCached.source,
          segmentsJson: repairedCached.segmentsJson ?? Prisma.JsonNull,
          dubbedAudioUrl: null,
          pipelineVersion: repairedCached.pipelineVersion,
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

    this.ensureOpenAi();
    await this.assertAndReserveQuota(userId);

    let job;
    try {
      job = await this.prisma.videoTranslateJob.create({
        data: {
          userId,
          youtubeVideoId: videoId,
          youtubeUrl,
          thumbnailUrl: youtubeThumbnailUrl(videoId),
          status: VideoTranslateStatus.PENDING,
          pipelineVersion: DUBBED_PIPELINE_VERSION,
        },
      });
    } catch (error) {
      await this.releaseQuotaReservation(userId);
      throw error;
    }

    void this.processJob(job.id).catch((error) => {
      this.logger.error(
        `Video translate job ${job.id} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return {
      job: this.serializeJob(job),
      quota: await this.getQuota(userId),
      fromCache: false,
    };
  }

  private async processJob(jobId: string) {
    if (this.processing.has(jobId)) return;
    this.processing.add(jobId);
    const startedAt = Date.now();
    const logStage = (stage: string) => {
      this.logger.log(
        `Video translate job ${jobId}: ${stage} (+${Date.now() - startedAt}ms)`,
      );
    };

    const jobDir = join(process.cwd(), 'storage', 'video-translate', jobId);
    const workDir = join(jobDir, 'work');
    mkdirSync(workDir, { recursive: true });

    try {
      const job = await this.prisma.videoTranslateJob.findUnique({
        where: { id: jobId },
      });
      if (!job) return;

      await this.prisma.videoTranslateJob.update({
        where: { id: jobId },
        data: { status: VideoTranslateStatus.PROCESSING, errorMessage: null },
      });

      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: job.userId },
        select: { isPremium: true, premiumExpiresAt: true },
      });
      const isPremium = this.resolvePremium(user);
      const maxSeconds = isPremium
        ? this.maxSecondsPremium()
        : this.maxSecondsFree();

      if (job.youtubeVideoId && job.youtubeUrl) {
        const meta = await this.fetchVideoMeta(
          job.youtubeVideoId,
          job.youtubeUrl,
        );
        if (meta.durationSec != null && meta.durationSec > maxSeconds) {
          throw new BadRequestException(
            `Video dài ${Math.ceil(meta.durationSec / 60)} phút — tối đa ${Math.floor(
              maxSeconds / 60,
            )} phút cho tài khoản ${isPremium ? 'Premium' : 'miễn phí'}.`,
          );
        }

        await this.prisma.videoTranslateJob.update({
          where: { id: jobId },
          data: {
            title: meta.title,
            durationSec: meta.durationSec,
            thumbnailUrl:
              meta.thumbnailUrl ?? youtubeThumbnailUrl(job.youtubeVideoId),
          },
        });
        logStage('metadata ready');

        const { segments: timed, source } = await this.getTimedTranscript(
          job.youtubeVideoId,
          job.youtubeUrl,
          workDir,
          meta.durationSec ?? maxSeconds,
        );
        logStage('transcript ready');
        if (!timed.length) {
          throw new BadRequestException(
            'Không tìm thấy lời thoại tiếng Anh trong video này',
          );
        }
        const durationSec =
          meta.durationSec ?? this.inferTranscriptDuration(timed);
        if (durationSec > maxSeconds) {
          throw new BadRequestException(
            `Video dài ${Math.ceil(durationSec / 60)} phút - tối đa ${Math.floor(
              maxSeconds / 60,
            )} phút cho tài khoản ${isPremium ? 'Premium' : 'miễn phí'}.`,
          );
        }
        const translated = await this.translateSegments(timed);
        logStage('translations ready');

        await this.prisma.videoTranslateJob.update({
          where: { id: jobId },
          data: {
            status: VideoTranslateStatus.READY,
            source,
            durationSec,
            segmentsJson: translated,
            dubbedAudioUrl: null,
            pipelineVersion: DUBBED_PIPELINE_VERSION,
            completedAt: new Date(),
            errorMessage: null,
          },
        });
        logStage('completed');
        return;
      }

      if (!job.mediaUrl) {
        throw new BadRequestException('Job thiếu nguồn video hoặc audio');
      }

      const sourcePath = this.resolveMediaPath(job.mediaUrl);
      if (!sourcePath || !existsSync(sourcePath)) {
        throw new BadRequestException('Không tìm thấy file đã tải lên');
      }

      const probedDurationSec = await this.probeDurationSec(sourcePath);
      const durationSec = Math.max(1, Math.round(probedDurationSec));

      if (durationSec > maxSeconds) {
        throw new BadRequestException(
          `Video dài ${Math.ceil(durationSec / 60)} phút — tối đa ${Math.floor(
            maxSeconds / 60,
          )} phút cho tài khoản ${isPremium ? 'Premium' : 'miễn phí'}.`,
        );
      }

      await this.prisma.videoTranslateJob.update({
        where: { id: jobId },
        data: {
          title: job.title || job.originalFilename || 'Video đã tải lên',
          durationSec,
        },
      });
      logStage('metadata ready');

      const thumbnailTask = this.extractUploadThumbnail(
        sourcePath,
        jobDir,
        jobId,
      )
        .then(async (thumbnailUrl) => {
          if (!thumbnailUrl) return;
          await this.prisma.videoTranslateJob.update({
            where: { id: jobId },
            data: { thumbnailUrl },
          });
        })
        .catch((error) => {
          this.logger.warn(
            `Thumbnail update failed for job ${jobId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });

      const audioPath = await this.prepareAudioForWhisper(sourcePath, workDir);
      logStage('audio ready');
      const whisperTranscript = await this.transcribeWithWhisper(audioPath);
      logStage('transcript ready');
      const normalized = whisperTranscript.segments.map((seg) => ({
        start: seg.start,
        end: seg.end || Math.min(durationSec, seg.start + 4),
        en: seg.en,
      }));
      const timed = this.finalizeSegments(
        normalized,
        durationSec,
        whisperTranscript.words,
      );
      const [translated] = await Promise.all([
        this.translateSegments(timed),
        thumbnailTask,
      ]);
      logStage('translations ready');

      await this.prisma.videoTranslateJob.update({
        where: { id: jobId },
        data: {
          status: VideoTranslateStatus.READY,
          source: 'upload-whisper',
          segmentsJson: translated,
          dubbedAudioUrl: null,
          pipelineVersion: DUBBED_PIPELINE_VERSION,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
      logStage('completed');
    } catch (error) {
      const message =
        error instanceof BadRequestException
          ? typeof error.getResponse() === 'string'
            ? (error.getResponse() as string)
            : ((error.getResponse() as { message?: string }).message ??
              error.message)
          : error instanceof Error
            ? error.message
            : 'Xử lý video thất bại';

      await this.prisma.videoTranslateJob.update({
        where: { id: jobId },
        data: {
          status: VideoTranslateStatus.FAILED,
          errorMessage: message,
        },
      });

      const job = await this.prisma.videoTranslateJob.findUnique({
        where: { id: jobId },
        select: { userId: true },
      });
      if (job) await this.releaseQuotaReservation(job.userId);
    } finally {
      this.processing.delete(jobId);
      try {
        rmSync(workDir, { recursive: true, force: true });
      } catch {
        // keep uploaded source under jobDir
      }
    }
  }

  private resolveUploadExtension(
    filename: string,
    mime?: string,
  ): string | null {
    const fromName = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    const allowed = new Set([
      'mp4',
      'webm',
      'mov',
      'mkv',
      'mp3',
      'm4a',
      'wav',
      'mpeg',
      'mpg',
    ]);
    if (fromName && allowed.has(fromName)) {
      return fromName === 'mpeg' || fromName === 'mpg' ? 'mp4' : fromName;
    }
    const lowerMime = String(mime || '').toLowerCase();
    if (lowerMime.includes('mp4') || lowerMime.includes('quicktime'))
      return 'mp4';
    if (lowerMime.includes('webm')) return 'webm';
    if (lowerMime.includes('audio/mpeg')) return 'mp3';
    if (lowerMime.includes('audio/mp4') || lowerMime.includes('m4a'))
      return 'm4a';
    if (lowerMime.includes('wav')) return 'wav';
    if (lowerMime.includes('matroska')) return 'mkv';
    return null;
  }

  private titleFromFilename(filename: string) {
    const base = filename.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
    const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, 120) || 'Video đã tải lên';
  }

  private resolveMediaPath(mediaUrl: string): string | null {
    const match = mediaUrl.match(/^\/media\/(.+)$/);
    if (!match) return null;
    return join(process.cwd(), 'storage', ...match[1].split('/'));
  }

  /** Lấy frame đầu làm thumbnail; bỏ qua nếu file chỉ có audio. */
  private async extractUploadThumbnail(
    sourcePath: string,
    jobDir: string,
    jobId: string,
  ): Promise<string | null> {
    if (/\.(mp3|m4a|wav|opus)$/i.test(sourcePath)) {
      return null;
    }
    const thumbName = 'thumb.jpg';
    const thumbPath = join(jobDir, thumbName);
    const ffmpeg = this.resolveFfmpegPath();
    const attempts = [
      [
        '-y',
        '-ss',
        '1',
        '-i',
        sourcePath,
        '-frames:v',
        '1',
        '-q:v',
        '4',
        '-vf',
        'scale=320:-2',
        thumbPath,
      ],
      [
        '-y',
        '-i',
        sourcePath,
        '-frames:v',
        '1',
        '-q:v',
        '4',
        '-vf',
        'scale=320:-2',
        thumbPath,
      ],
    ];
    for (const args of attempts) {
      try {
        await execFileAsync(ffmpeg, args, {
          timeout: 60_000,
          maxBuffer: 4 * 1024 * 1024,
        });
        if (existsSync(thumbPath)) {
          return `/media/video-translate/${jobId}/${thumbName}`;
        }
      } catch {
        // thử attempt tiếp theo
      }
    }
    this.logger.warn(`Không tạo được thumbnail cho job ${jobId}`);
    return null;
  }

  private async prepareAudioForWhisper(sourcePath: string, workDir: string) {
    const outPath = join(workDir, 'whisper.mp3');
    const ffmpeg = this.resolveFfmpegPath();
    try {
      await execFileAsync(
        ffmpeg,
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          sourcePath,
          '-map',
          '0:a:0',
          '-vn',
          '-sn',
          '-dn',
          '-ac',
          '1',
          '-ar',
          '16000',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '48k',
          outPath,
        ],
        { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 },
      );
    } catch (error) {
      this.logger.error(
        `ffmpeg extract audio failed: ${this.commandErrorLog(error)}`,
      );
      throw new ServiceUnavailableException(
        'Không chuẩn hóa được audio từ file tải lên. Thử file mp3/m4a hoặc mp4 khác.',
      );
    }
    if (!existsSync(outPath)) {
      throw new ServiceUnavailableException(
        'Không tạo được file audio để nhận dạng',
      );
    }
    return outPath;
  }

  private async getTimedTranscript(
    videoId: string,
    youtubeUrl: string,
    workDir: string,
    durationSec: number,
  ): Promise<{
    segments: Array<{ start: number; end: number; en: string }>;
    source: string;
  }> {
    const captionTranscript = await this.tryFetchCaptions(videoId, durationSec);
    if (captionTranscript.segments.length > 0) {
      return {
        segments: this.finalizeSegments(
          captionTranscript.segments,
          durationSec,
          captionTranscript.words,
        ),
        source: 'captions',
      };
    }

    this.logger.log(`No captions for ${videoId} — using Whisper STT`);
    const audioPath = await this.downloadAudio(youtubeUrl, workDir);
    const whisperTranscript = await this.transcribeWithWhisper(audioPath);
    const normalized = whisperTranscript.segments.map((seg) => ({
      start: seg.start,
      end: seg.end || Math.min(durationSec, seg.start + 4),
      en: seg.en,
    }));
    return {
      segments: this.finalizeSegments(
        normalized,
        durationSec,
        whisperTranscript.words,
      ),
      source: 'whisper',
    };
  }

  private async tryFetchCaptions(
    videoId: string,
    durationSec: number,
  ): Promise<CaptionTranscript> {
    try {
      let items = await fetchTranscript(videoId, { lang: 'en' });
      if (!items?.length) {
        items = await fetchTranscript(videoId);
      }
      if (!items?.length) return { segments: [], words: [] };

      const maxOffset = Math.max(
        ...items.map((item) => Number(item.offset) || 0),
      );
      const unitIsMs = maxOffset > durationSec * 1.5 + 5;

      const segments = items
        .map((item) => {
          const rawStart = Number(item.offset) || 0;
          const rawDur = Number(item.duration) || 0;
          const start = unitIsMs ? rawStart / 1000 : rawStart;
          const duration = unitIsMs ? rawDur / 1000 : rawDur;
          const en = this.cleanCaptionText(item.text);
          if (!en) return null;
          const wordCount = en.split(/\s+/).filter(Boolean).length;
          // Giữ duration gốc của YT khi có; chỉ ước lượng nếu thiếu
          const safeDur =
            duration > 0.12
              ? duration
              : Math.min(4, Math.max(0.45, 0.3 + wordCount * 0.25));
          return {
            start: Number.isFinite(start) ? start : 0,
            end: Number.isFinite(start + safeDur) ? start + safeDur : start + 2,
            en,
          };
        })
        .filter(
          (seg): seg is { start: number; end: number; en: string } =>
            seg != null && seg.en.length > 0,
        )
        .sort((a, b) => a.start - b.start || a.end - b.end);

      return {
        segments,
        words: this.buildCaptionWordTimings(segments, durationSec),
      };
    } catch (error) {
      this.logger.warn(
        `Caption fetch failed for ${videoId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { segments: [], words: [] };
    }
  }

  private cleanCaptionText(text: string) {
    return text
      .replace(/\[.*?\]/g, ' ')
      .replace(/\(.*?\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * YouTube captions expose cue timestamps, but usually not timestamps for
   * individual words. Use the next cue as the end of an overlapping cue and
   * distribute its words inside that smaller window. This preserves the real
   * caption transitions instead of stretching a merged sentence uniformly.
   */
  private buildCaptionWordTimings(
    segments: TimedEnglishSegment[],
    durationSec: number,
  ): RawEnglishWordTiming[] {
    const words: RawEnglishWordTiming[] = [];
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, '');

    segments.forEach((segment, index) => {
      const nextStart = segments[index + 1]?.start;
      const clippedEnd =
        nextStart != null && nextStart > segment.start + 0.05
          ? Math.min(segment.end, nextStart)
          : segment.end;
      const end = Math.min(
        durationSec,
        Math.max(segment.start + 0.12, clippedEnd),
      );
      const estimated = this.estimateWordTimings({ ...segment, end }).map(
        (word) => ({ start: word.start, end: word.end, en: word.text }),
      );

      const maxOverlap = Math.min(words.length, estimated.length);
      let overlap = maxOverlap;
      while (overlap > 0) {
        const tail = words.slice(-overlap);
        const head = estimated.slice(0, overlap);
        if (
          tail.every(
            (word, wordIndex) =>
              normalize(word.en).length > 0 &&
              normalize(word.en) === normalize(head[wordIndex].en),
          )
        ) {
          break;
        }
        overlap -= 1;
      }

      words.push(...estimated.slice(overlap));
    });

    return words;
  }

  /**
   * Áp dụng TRANSCRIPT_RULES: gộp từ/mảnh → câu hoàn chỉnh, căn timing.
   */
  private finalizeSegments(
    segments: Array<{ start: number; end: number; en: string }>,
    durationSec: number,
    wordTimings: Array<{ start: number; end: number; en: string }> = [],
  ) {
    const sorted = [...segments].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    );
    const collapsed = this.collapseRollingCaptions(sorted);
    const sentenceParts = this.splitMultiSentence(collapsed);
    const utterances = this.mergeIntoUtterances(sentenceParts);
    const aligned = this.alignSegmentWindows(utterances, durationSec).filter(
      (seg) => seg.en.trim().length > 0,
    );
    return wordTimings.length
      ? this.attachWordTimings(aligned, wordTimings)
      : aligned;
  }

  private wordCount(text: string) {
    return text.split(/\s+/).filter(Boolean).length;
  }

  private endsUtterance(text: string) {
    return /[.!?…]["')\]]?\s*$/.test(text.trim());
  }

  private joinSegmentText(left: string, right: string) {
    const leftWords = left.trim().split(/\s+/).filter(Boolean);
    const rightWords = right.trim().split(/\s+/).filter(Boolean);
    const comparable = (word: string) =>
      word.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
    const leftComparable = leftWords.map(comparable);
    const rightComparable = rightWords.map(comparable);

    let overlap = Math.min(leftWords.length, rightWords.length);
    while (overlap > 0) {
      const leftTail = leftComparable.slice(-overlap);
      const rightHead = rightComparable.slice(0, overlap);
      if (
        leftTail.every(
          (word, index) => word.length > 0 && word === rightHead[index],
        )
      ) {
        break;
      }
      overlap -= 1;
    }

    return [...leftWords, ...rightWords.slice(overlap)]
      .join(' ')
      .replace(/\s+([,.;!?…])/g, '$1')
      .trim();
  }

  private mergeTwoSegments(
    a: { start: number; end: number; en: string },
    b: { start: number; end: number; en: string },
  ) {
    return {
      start: Math.min(a.start, b.start),
      end: Math.max(a.end, b.end),
      en: this.joinSegmentText(a.en, b.en),
    };
  }

  /** Caption rolling/overlap: dòng sau thay thế dòng trước. */
  private collapseRollingCaptions(
    segments: Array<{ start: number; end: number; en: string }>,
  ) {
    const out: Array<{ start: number; end: number; en: string }> = [];

    for (const seg of segments) {
      const last = out[out.length - 1];
      if (!last) {
        out.push({ ...seg });
        continue;
      }

      const normalizeWords = (text: string) =>
        text
          .toLowerCase()
          .split(/\s+/)
          .map((word) => word.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ''))
          .filter(Boolean);
      const lastWords = normalizeWords(last.en);
      const nextWords = normalizeWords(seg.en);
      const overlaps = seg.start <= last.end + 0.25;
      const containsSequence = (haystack: string[], needle: string[]) => {
        if (!needle.length || needle.length > haystack.length) return false;
        return haystack.some((_, start) =>
          needle.every((word, index) => haystack[start + index] === word),
        );
      };
      const sameText =
        lastWords.length === nextWords.length &&
        lastWords.every((word, index) => word === nextWords[index]);
      const oneContainsTheOther =
        containsSequence(nextWords, lastWords) ||
        containsSequence(lastWords, nextWords);
      const isExtension =
        sameText ||
        (oneContainsTheOther &&
          (!this.endsUtterance(last.en) || seg.start <= last.end));

      if (overlaps && isExtension) {
        last.end = Math.max(last.end, seg.end);
        if (nextWords.length >= lastWords.length) last.en = seg.en;
        continue;
      }

      out.push({ ...seg });
    }

    return out;
  }

  /**
   * Quy tắc gộp chính:
   * - Nghỉ ≥ 0.5s luôn cắt thẻ mới.
   * - Dấu kết câu cắt thẻ mới ngay cả với câu rất ngắn.
   * - Các mảnh sát nhau chỉ được gộp khi vẫn thuộc cùng một câu.
   */
  private mergeIntoUtterances(
    segments: Array<{ start: number; end: number; en: string }>,
  ) {
    const { pauseBreakSec, timestampEpsilonSec } = TRANSCRIPT_RULES;
    const merged: Array<{ start: number; end: number; en: string }> = [];

    for (const seg of segments) {
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push({ ...seg });
        continue;
      }

      const gap = seg.start - last.end;
      const lastEnded = this.endsUtterance(last.en);

      if (gap + timestampEpsilonSec >= pauseBreakSec || lastEnded) {
        merged.push({ ...seg });
        continue;
      }

      const joined = this.mergeTwoSegments(last, seg);
      last.start = joined.start;
      last.end = joined.end;
      last.en = joined.en;
    }

    return merged;
  }

  private splitMultiSentence(
    segments: Array<{ start: number; end: number; en: string }>,
  ) {
    const out: Array<{ start: number; end: number; en: string }> = [];
    const sentenceSegmenter = new Intl.Segmenter('en', {
      granularity: 'sentence',
    });

    for (const seg of segments) {
      const parts = Array.from(sentenceSegmenter.segment(seg.en), (part) =>
        part.segment.trim(),
      ).filter(Boolean);

      if (parts.length <= 1) {
        out.push({ ...seg });
        continue;
      }

      const totalDur = Math.max(0.45, seg.end - seg.start);
      const totalChars = parts.reduce((sum, part) => sum + part.length, 0) || 1;
      let cursor = seg.start;

      parts.forEach((part, index) => {
        const share = part.length / totalChars;
        const dur = Math.max(0.4, totalDur * share);
        const end =
          index === parts.length - 1
            ? seg.end
            : Math.min(seg.end, cursor + dur);
        out.push({ start: cursor, end, en: part });
        cursor = end;
      });
    }

    return out;
  }

  /** Căn thời gian hiển thị nhưng giữ nguyên khoảng nghỉ dùng để cắt câu. */
  private alignSegmentWindows(
    segments: Array<{ start: number; end: number; en: string }>,
    durationSec: number,
  ) {
    const sorted = [...segments].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    );

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
        if (
          gap + TRANSCRIPT_RULES.timestampEpsilonSec >=
          TRANSCRIPT_RULES.pauseBreakSec
        ) {
          end = Math.min(seg.end, nextStart - 0.04);
        } else {
          end = Math.max(seg.start + 0.35, nextStart - 0.04);
        }
      }

      return {
        ...seg,
        start: Math.max(0, seg.start),
        end: Math.max(seg.start + 0.12, end),
      };
    });
  }

  private attachWordTimings(
    segments: Array<{ start: number; end: number; en: string }>,
    rawWords: RawEnglishWordTiming[],
  ): TimedEnglishSegment[] {
    const words = [...rawWords].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    );

    const mappedSegments = segments.map((segment, index) => {
      const previousStart = segments[index - 1]?.start;
      const nextEnd = segments[index + 1]?.end;
      const lowerBound = (previousStart ?? segment.start - 1) - 0.1;
      const upperBound = (nextEnd ?? segment.end + 1) + 0.1;
      const candidates = words.filter((word) => {
        const midpoint = (word.start + word.end) / 2;
        return midpoint >= lowerBound && midpoint <= upperBound;
      });
      const mapped = this.mapWordsToSegment(segment, candidates);

      return {
        ...segment,
        words: mapped.length
          ? this.stabilizeWordTimingWindows(mapped, segment.end)
          : this.estimateWordTimings(segment),
      };
    });

    return mappedSegments.map((segment, index) => {
      if (!segment.words?.length) return segment;
      const firstWordStart = segment.words[0].start;
      const lastWordEnd = segment.words[segment.words.length - 1].end;
      const nextWordStart = mappedSegments[index + 1]?.words?.[0]?.start;
      const end =
        nextWordStart != null
          ? Math.max(lastWordEnd, nextWordStart - 0.04)
          : Math.max(lastWordEnd, segment.end);

      return {
        ...segment,
        start: firstWordStart,
        end: Math.max(firstWordStart + 0.12, end),
      };
    });
  }

  private mapWordsToSegment(
    segment: { start: number; end: number; en: string },
    candidates: Array<{ start: number; end: number; en: string }>,
  ): VideoWordTiming[] {
    const displayWords = segment.en.split(/\s+/).filter(Boolean);
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, '');

    for (
      let startOffset = 0;
      startOffset <= candidates.length - 1;
      startOffset += 1
    ) {
      const mapped: VideoWordTiming[] = [];
      let candidateIndex = startOffset;
      let failed = false;

      for (const displayWord of displayWords) {
        const target = normalize(displayWord);
        if (!target) {
          failed = true;
          break;
        }

        let combined = '';
        let matchedEnd = -1;
        for (
          let endIndex = candidateIndex;
          endIndex < Math.min(candidates.length, candidateIndex + 3);
          endIndex += 1
        ) {
          combined += normalize(candidates[endIndex].en);
          if (combined === target) {
            matchedEnd = endIndex;
            break;
          }
          if (!target.startsWith(combined)) break;
        }

        if (matchedEnd < candidateIndex) {
          failed = true;
          break;
        }

        mapped.push({
          text: displayWord,
          start: candidates[candidateIndex].start,
          end: candidates[matchedEnd].end,
        });
        candidateIndex = matchedEnd + 1;
      }

      if (!failed && mapped.length === displayWords.length) return mapped;
    }

    return [];
  }

  private stabilizeWordTimingWindows(
    words: VideoWordTiming[],
    segmentEnd: number,
  ) {
    const stabilized = words.map((word) => ({ ...word }));
    let index = 0;

    while (index < stabilized.length) {
      let groupEnd = index;
      while (
        groupEnd + 1 < stabilized.length &&
        Math.abs(stabilized[groupEnd + 1].start - stabilized[index].start) <=
          0.015
      ) {
        groupEnd += 1;
      }

      if (groupEnd > index) {
        const group = stabilized.slice(index, groupEnd + 1);
        const nextStart = stabilized[groupEnd + 1]?.start ?? segmentEnd;
        const naturalEnd = Math.max(...group.map((word) => word.end));
        const windowEnd = Math.max(
          group[0].start + group.length * 0.08,
          Math.min(nextStart, naturalEnd),
        );
        const weights = group.map((word) =>
          Math.max(1, word.text.replace(/[^a-z0-9]+/gi, '').length),
        );
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let cursor = group[0].start;

        group.forEach((word, groupIndex) => {
          const end =
            groupIndex === group.length - 1
              ? windowEnd
              : cursor +
                ((windowEnd - group[0].start) * weights[groupIndex]) /
                  totalWeight;
          stabilized[index + groupIndex] = {
            ...word,
            start: cursor,
            end,
          };
          cursor = end;
        });
      } else if (stabilized[index].end <= stabilized[index].start) {
        const nextStart = stabilized[index + 1]?.start ?? segmentEnd;
        stabilized[index].end = Math.min(
          nextStart,
          stabilized[index].start + 0.12,
        );
      }

      index = groupEnd + 1;
    }

    return stabilized;
  }

  private estimateWordTimings(segment: {
    start: number;
    end: number;
    en: string;
  }): VideoWordTiming[] {
    const words = segment.en.split(/\s+/).filter(Boolean);
    const weights = words.map((word) =>
      Math.max(1, word.replace(/[^a-z0-9]+/gi, '').length),
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const duration = Math.max(0.12, segment.end - segment.start);
    let cursor = segment.start;

    return words.map((text, index) => {
      const end =
        index === words.length - 1
          ? segment.end
          : cursor + (duration * weights[index]) / totalWeight;
      const timing = { text, start: cursor, end };
      cursor = end;
      return timing;
    });
  }

  private async translateSegments(
    segments: TimedEnglishSegment[],
  ): Promise<VideoSegment[]> {
    this.ensureOpenAi();
    if (!segments.length) return [];

    const batchSize = this.translationBatchSize();
    const batches: TimedEnglishSegment[][] = [];
    for (let i = 0; i < segments.length; i += batchSize) {
      batches.push(segments.slice(i, i + batchSize));
    }

    const translatedBatches = await this.runWithConcurrency(
      batches,
      this.translationConcurrency(),
      (batch) => this.translateBatch(batch),
    );
    return translatedBatches.flat();
  }

  private async translateBatch(
    batch: TimedEnglishSegment[],
  ): Promise<VideoSegment[]> {
    const payload = batch.map((seg, idx) => ({ i: idx, en: seg.en }));
    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Translate each English transcript item into accurate, idiomatic contemporary Vietnamese for learners. Use neighboring items only to understand context and pronoun references, but translate exactly one source item per output index. Prefer natural Vietnamese phrasing over word-for-word wording and avoid redundancy. Preserve every idea: never omit content, merge items, or move content to another index. Keep names and factual details accurate. Return exactly one non-empty translation for every input index as JSON: {"items":[{"i":0,"vi":"..."}]}. No explanations.',
        },
        {
          role: 'user',
          content: JSON.stringify({ items: payload }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const translations = new Map<number, string>();
    try {
      const parsed = JSON.parse(raw) as {
        items?: Array<{ i: number; vi: string }>;
      };
      for (const item of parsed.items ?? []) {
        if (
          Number.isInteger(item?.i) &&
          item.i >= 0 &&
          item.i < batch.length &&
          typeof item.vi === 'string' &&
          item.vi.trim()
        ) {
          translations.set(item.i, item.vi.trim());
        }
      }
    } catch {
      // Cả batch sẽ dùng fallback bên dưới.
    }

    const missing = batch
      .map((segment, index) => ({ segment, index }))
      .filter(({ index }) => !translations.has(index));
    const fallbackTranslations = await this.runWithConcurrency(
      missing,
      this.translationConcurrency(),
      async ({ segment, index }) => ({
        index,
        vi: await this.translateOne(segment.en),
      }),
    );
    for (const fallback of fallbackTranslations) {
      translations.set(fallback.index, fallback.vi);
    }

    return batch.map((seg, index) => ({
      start: seg.start,
      end: seg.end,
      en: seg.en,
      ...(seg.words?.length ? { words: seg.words } : {}),
      vi: translations.get(index) || seg.en,
    }));
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    if (!items.length) return [];

    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(
      items.length,
      Math.max(1, Math.floor(concurrency)),
    );

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await worker(items[index], index);
        }
      }),
    );
    return results;
  }

  private async translateOne(text: string) {
    this.ensureOpenAi();
    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Translate the complete English sentence into accurate, natural Vietnamese. Preserve every idea and factual detail. Do not shorten or omit content. Return only the translation.',
        },
        { role: 'user', content: text },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || text;
  }

  private async buildDubbedAudio(
    jobId: string,
    jobDir: string,
    workDir: string,
    segments: VideoSegment[],
    durationSec: number,
  ) {
    const partsDir = join(workDir, 'parts');
    mkdirSync(partsDir, { recursive: true });

    const partFiles: Array<{ path: string; delayMs: number }> = [];
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      if (!seg.vi.trim()) continue;

      const nextStart = segments[i + 1]?.start ?? durationSec;
      // Dùng khoảng đến câu tiếp theo để TTS có chỗ thở, vẫn khớp nhịp cảnh
      const windowEnd = Math.max(
        seg.start + 0.35,
        Math.min(seg.end + 0.15, nextStart - 0.04),
      );
      const targetDur = Math.max(0.35, windowEnd - seg.start);

      const buffer = await this.synthesizeVietnamese(seg.vi);
      const rawPath = join(partsDir, `raw-${String(i).padStart(3, '0')}.mp3`);
      const fittedPath = join(
        partsDir,
        `fit-${String(i).padStart(3, '0')}.mp3`,
      );
      writeFileSync(rawPath, buffer);
      await this.fitSpeechToWindow(rawPath, fittedPath, targetDur);

      partFiles.push({
        path: fittedPath,
        delayMs: Math.max(0, Math.round(seg.start * 1000)),
      });
    }

    if (partFiles.length === 0) {
      throw new BadRequestException(
        'Không tạo được audio tiếng Việt từ transcript',
      );
    }

    mkdirSync(jobDir, { recursive: true });
    const outPath = join(jobDir, 'dubbed.mp3');
    const silencePath = join(workDir, 'silence.mp3');
    const totalSec = Math.max(
      durationSec,
      Math.ceil(segments.at(-1)?.end ?? 1) + 1,
    );

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
      const mixedPath = join(workDir, `mix-${i}.mp3`);
      const inputs = ['-y', '-i', currentBase];
      for (const part of batch) {
        inputs.push('-i', part.path);
      }

      const filters: string[] = [];
      const mixInputs = ['[0:a]'];
      batch.forEach((part, idx) => {
        const label = `a${idx}`;
        filters.push(
          `[${idx + 1}:a]adelay=${part.delayMs}|${part.delayMs},volume=1.15[${label}]`,
        );
        mixInputs.push(`[${label}]`);
      });
      filters.push(
        `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0[out]`,
      );

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

    writeFileSync(outPath, readFileSync(currentBase));
    return `/media/video-translate/${jobId}/dubbed.mp3`;
  }

  /** Kéo/nén TTS để khớp khung thời gian của cảnh (atempo + pad/trim). */
  private async fitSpeechToWindow(
    inputPath: string,
    outputPath: string,
    targetDur: number,
  ) {
    const rawDur = await this.probeDurationSec(inputPath);
    if (!Number.isFinite(rawDur) || rawDur <= 0.05) {
      writeFileSync(outputPath, readFileSync(inputPath));
      return;
    }

    // atempo = tốc độ phát; duration_out = duration_in / atempo
    let speed = rawDur / targetDur;
    // Giữ giọng nghe được: không quá chậm / quá nhanh
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

  private buildAtempoFilter(speed: number) {
    const parts: string[] = [];
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

  private async probeDurationSec(filePath: string) {
    const ffmpeg = this.resolveFfmpegPath();
    try {
      const { stderr } = await execFileAsync(
        ffmpeg,
        ['-i', filePath, '-f', 'null', '-'],
        { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
      );
      const match = String(stderr).match(
        /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/,
      );
      if (!match) return 0;
      const h = Number(match[1]);
      const m = Number(match[2]);
      const s = Number(match[3]);
      return h * 3600 + m * 60 + s;
    } catch (error) {
      const stderr =
        error && typeof error === 'object' && 'stderr' in error
          ? String((error as { stderr?: Buffer | string }).stderr ?? '')
          : '';
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) return 0;
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
  }

  private async synthesizeVietnamese(text: string): Promise<Buffer> {
    const elevenKey = this.config.get<string>('ELEVENLABS_API_KEY')?.trim();
    const voiceId = this.config.get<string>('ELEVENLABS_VOICE_ID')?.trim();
    if (elevenKey && voiceId) {
      return this.synthesizeElevenLabs(text, elevenKey, voiceId);
    }
    return this.synthesizeOpenAiTts(text);
  }

  private async synthesizeElevenLabs(
    text: string,
    apiKey: string,
    voiceId: string,
  ) {
    const model =
      this.config.get<string>('ELEVENLABS_MODEL_ID')?.trim() ||
      'eleven_turbo_v2_5';
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
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
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new ServiceUnavailableException(
        `ElevenLabs TTS lỗi (${res.status}): ${body.slice(0, 200)}`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }

  private async synthesizeOpenAiTts(text: string) {
    this.ensureOpenAi();
    try {
      const speech = await this.openai!.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: text,
        instructions:
          'Speak clear Vietnamese at a natural conversational pace.',
        response_format: 'mp3',
      });
      return Buffer.from(await speech.arrayBuffer());
    } catch (error) {
      const speech = await this.openai!.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3',
      });
      this.logger.warn(
        `gpt-4o-mini-tts unavailable, fell back to tts-1: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return Buffer.from(await speech.arrayBuffer());
    }
  }

  private async downloadAudio(youtubeUrl: string, workDir: string) {
    const ytDlp = this.resolveYtDlpPath();
    const ffmpeg = this.resolveFfmpegPath();
    const outTemplate = join(workDir, 'audio.%(ext)s');
    const connectionArgs = this.ytDlpConnectionArgs();
    const usingProxy = connectionArgs.includes('--proxy');
    const runDownload = (args: string[]) =>
      execFileAsync(
        ytDlp,
        [
          '--js-runtimes',
          'node',
          ...args,
          '-f',
          'bestaudio/best',
          '-x',
          '--audio-format',
          'mp3',
          '--audio-quality',
          '5',
          '--ffmpeg-location',
          ffmpeg,
          '--no-playlist',
          '-o',
          outTemplate,
          youtubeUrl,
        ],
        { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 },
      );

    try {
      await runDownload(connectionArgs);
    } catch (error) {
      const detail = this.commandErrorDetail(error);
      this.logger.error(
        `yt-dlp download failed: ${this.commandErrorLog(error)}`,
      );

      if (usingProxy && this.isProxyParseError(detail)) {
        this.logger.warn(
          'YT_DLP_PROXY không hợp lệ; đang thử tải lại bằng kết nối trực tiếp.',
        );
        try {
          await runDownload(this.ytDlpConnectionArgs(false));
        } catch (retryError) {
          const retryDetail = this.commandErrorDetail(retryError);
          this.logger.error(
            `yt-dlp direct retry failed: ${this.commandErrorLog(retryError)}`,
          );
          throw new ServiceUnavailableException(
            this.ytDlpInvalidProxyError(retryDetail, true),
          );
        }
      } else if (
        this.hasConfiguredYtDlpProxy() &&
        !this.normalizedYtDlpProxy()
      ) {
        throw new ServiceUnavailableException(
          this.ytDlpInvalidProxyError(detail),
        );
      } else {
        throw new ServiceUnavailableException(
          this.ytDlpUserFacingError(detail),
        );
      }
    }

    const files = readdirSync(workDir).filter((name) =>
      /^audio\.(mp3|m4a|webm|opus|wav)$/i.test(name),
    );
    if (!files.length) {
      throw new ServiceUnavailableException(
        'Không tìm thấy file audio sau khi tải',
      );
    }
    return join(workDir, files[0]);
  }

  private async transcribeWithWhisper(audioPath: string) {
    this.ensureOpenAi();
    const result = await this.openai!.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
    });

    const timedResult = result as unknown as {
      text?: string;
      words?: Array<{ start?: number; end?: number; word?: string }>;
      segments?: Array<{ start?: number; end?: number; text?: string }>;
    };
    const words = (timedResult.words ?? [])
      .map((word) => {
        const start = Number(word.start) || 0;
        return {
          start,
          end: Number(word.end) || start + 0.3,
          en: this.cleanCaptionText(String(word.word ?? '')),
        };
      })
      .filter((word) => word.en.length > 0);

    return {
      segments: this.buildWhisperTimedSegments(timedResult),
      words,
    };
  }

  /**
   * Whisper trả cả `segments` có dấu câu và `words` có timing chi tiết.
   * Ưu tiên segments để không làm mất ranh giới câu; words chỉ dùng để giữ
   * ranh giới nghỉ 0.5s nằm bên trong một segment hoặc làm phương án dự phòng.
   */
  private buildWhisperTimedSegments(timedResult: {
    text?: string;
    words?: Array<{ start?: number; end?: number; word?: string }>;
    segments?: Array<{ start?: number; end?: number; text?: string }>;
  }) {
    const words = (timedResult.words ?? [])
      .map((word) => {
        const start = Number(word.start) || 0;
        return {
          start,
          end: Number(word.end) || start + 0.3,
          en: this.cleanCaptionText(String(word.word ?? '')),
        };
      })
      .filter((word) => word.en.length > 0);

    const captionSegments = (timedResult.segments ?? [])
      .map((segment) => {
        const start = Number(segment.start) || 0;
        return {
          start,
          end: Number(segment.end) || start + 2,
          en: this.cleanCaptionText(String(segment.text ?? '')),
        };
      })
      .filter((segment) => segment.en.length > 0);

    if (captionSegments.length) {
      return this.splitWhisperSegmentsAtInternalPauses(captionSegments, words);
    }

    if (words.length) return words;

    if (timedResult.text) {
      return [
        {
          start: 0,
          end: 4,
          en: String(timedResult.text).trim(),
        },
      ];
    }

    return [];
  }

  private splitWhisperSegmentsAtInternalPauses(
    segments: Array<{ start: number; end: number; en: string }>,
    words: Array<{ start: number; end: number; en: string }>,
  ) {
    if (!words.length) return segments;

    const out: Array<{ start: number; end: number; en: string }> = [];
    let wordCursor = 0;

    for (const segment of segments) {
      while (
        wordCursor < words.length &&
        words[wordCursor].end < segment.start - 0.08
      ) {
        wordCursor += 1;
      }

      const segmentWords: Array<{ start: number; end: number; en: string }> =
        [];
      while (wordCursor < words.length) {
        const word = words[wordCursor];
        const midpoint = (word.start + word.end) / 2;
        if (midpoint > segment.end + 0.08) break;
        if (midpoint >= segment.start - 0.08) segmentWords.push(word);
        wordCursor += 1;
      }

      const groups: Array<typeof segmentWords> = [];
      for (const word of segmentWords) {
        const group = groups[groups.length - 1];
        const previousWord = group?.[group.length - 1];
        if (
          !group ||
          (previousWord &&
            word.start -
              previousWord.end +
              TRANSCRIPT_RULES.timestampEpsilonSec >=
              TRANSCRIPT_RULES.pauseBreakSec)
        ) {
          groups.push([word]);
        } else {
          group.push(word);
        }
      }

      if (groups.length <= 1) {
        out.push(segment);
        continue;
      }

      const terminalPunctuation =
        segment.en.match(/([.!?…]+["')\]]?)\s*$/)?.[1] ?? '';
      groups.forEach((group, index) => {
        let en = group
          .map((word) => word.en)
          .join(' ')
          .trim();
        if (index === groups.length - 1 && terminalPunctuation) {
          en = `${en.replace(/[.!?…]+$/, '')}${terminalPunctuation}`;
        }
        out.push({
          start: group[0].start,
          end: group[group.length - 1].end,
          en,
        });
      });
    }

    return out;
  }

  private async fetchVideoMeta(videoId: string, youtubeUrl: string) {
    try {
      const ytDlp = this.resolveYtDlpPath();
      const { stdout } = await execFileAsync(
        ytDlp,
        [
          '--js-runtimes',
          'node',
          ...this.ytDlpConnectionArgs(),
          '--dump-json',
          '--no-playlist',
          youtubeUrl,
        ],
        { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
      );
      const data = JSON.parse(stdout) as {
        title?: string;
        duration?: number;
        thumbnail?: string;
      };
      return {
        title: data.title?.trim() || `YouTube ${videoId}`,
        durationSec: Math.max(1, Math.round(Number(data.duration) || 1)),
        thumbnailUrl: data.thumbnail || youtubeThumbnailUrl(videoId),
      };
    } catch {
      const durationSec = await this.fetchYoutubeWatchDuration(youtubeUrl);
      let title = `YouTube ${videoId}`;
      let thumbnailUrl = youtubeThumbnailUrl(videoId);
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            title?: string;
            thumbnail_url?: string;
          };
          title = data.title?.trim() || title;
          thumbnailUrl = data.thumbnail_url || thumbnailUrl;
        }
      } catch {
        // ignore
      }
      return {
        title,
        durationSec,
        thumbnailUrl,
      };
    }
  }

  private parseYoutubeWatchDuration(content: string) {
    const match = content.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/);
    const durationSec = Number(match?.[1]);
    return Number.isFinite(durationSec) && durationSec > 0
      ? Math.round(durationSec)
      : null;
  }

  private async fetchYoutubeWatchDuration(youtubeUrl: string) {
    try {
      const response = await fetch(youtubeUrl, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127 Safari/537.36',
          'accept-language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return null;
      return this.parseYoutubeWatchDuration(await response.text());
    } catch {
      return null;
    }
  }

  private inferTranscriptDuration(
    segments: Array<{ start: number; end: number }>,
  ) {
    const lastTimestamp = segments.reduce(
      (max, segment) => Math.max(max, segment.end, segment.start),
      0,
    );
    return Math.max(1, Math.ceil(lastTimestamp));
  }

  private async repairLegacyYoutubeDuration<
    T extends {
      id: string;
      youtubeVideoId: string | null;
      youtubeUrl: string | null;
      durationSec: number | null;
      status: VideoTranslateStatus;
      segmentsJson: Prisma.JsonValue | null;
    },
  >(job: T): Promise<T> {
    if (
      job.status !== VideoTranslateStatus.READY ||
      !job.youtubeVideoId ||
      !job.youtubeUrl ||
      job.durationSec == null
    ) {
      return job;
    }

    const knownFallbackDurations = new Set([
      this.maxSecondsFree(),
      this.maxSecondsPremium(),
    ]);
    if (!knownFallbackDurations.has(job.durationSec)) return job;

    const transcriptDuration = this.inferTranscriptDuration(
      this.parseSegments(job.segmentsJson),
    );
    if (transcriptDuration >= job.durationSec - 2) return job;

    const durationSec = await this.fetchYoutubeWatchDuration(job.youtubeUrl);
    if (durationSec == null || durationSec === job.durationSec) return job;

    await this.prisma.videoTranslateJob.update({
      where: { id: job.id },
      data: { durationSec },
    });
    return { ...job, durationSec };
  }

  private resolveYtDlpPath() {
    const configured = this.config.get<string>('YT_DLP_PATH')?.trim();
    if (configured && existsSync(configured)) return configured;

    for (const candidate of this.localToolCandidates('yt-dlp.exe', 'yt-dlp')) {
      if (existsSync(candidate)) return candidate;
    }

    return 'yt-dlp';
  }

  private resolveFfmpegPath() {
    const configured = this.config.get<string>('FFMPEG_PATH')?.trim();
    if (configured && existsSync(configured)) return configured;

    if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
      return ffmpegStaticPath;
    }

    for (const candidate of this.localToolCandidates('ffmpeg.exe', 'ffmpeg')) {
      if (existsSync(candidate)) return candidate;
    }

    return 'ffmpeg';
  }

  private ytDlpConnectionArgs(includeProxy = true) {
    const args: string[] = [];
    const configuredProxy = this.config.get<string>('YT_DLP_PROXY')?.trim();
    const proxy = includeProxy
      ? this.normalizeYtDlpProxy(configuredProxy)
      : null;
    const cookiesPath = this.resolveYtDlpCookiesPath();
    const forceIpv4 =
      this.config.get<string>('YT_DLP_FORCE_IPV4')?.trim().toLowerCase() ===
      'true';
    const extractorArgs =
      this.config.get<string>('YT_DLP_EXTRACTOR_ARGS')?.trim() ||
      'youtube:player_client=android,tv,web';

    if (proxy) {
      args.push('--proxy', proxy);
    } else if (includeProxy && configuredProxy) {
      this.logger.warn(
        'YT_DLP_PROXY không đúng định dạng; sẽ thử kết nối trực tiếp.',
      );
    }
    if (cookiesPath) {
      args.push('--cookies', cookiesPath);
    } else {
      this.logger.warn(
        'YT_DLP cookies chưa cấu hình — IP server dễ bị YouTube chặn bot. ' +
          'Set YT_DLP_COOKIES_PATH hoặc YT_DLP_COOKIES_BASE64.',
      );
    }
    if (forceIpv4) args.push('--force-ipv4');
    if (extractorArgs) args.push('--extractor-args', extractorArgs);

    return args;
  }

  private hasConfiguredYtDlpProxy() {
    return Boolean(this.config.get<string>('YT_DLP_PROXY')?.trim());
  }

  private normalizedYtDlpProxy() {
    return this.normalizeYtDlpProxy(
      this.config.get<string>('YT_DLP_PROXY')?.trim(),
    );
  }

  private normalizeYtDlpProxy(raw: string | undefined): string | null {
    let value = raw?.trim();
    if (!value) return null;

    if (/^YT_DLP_PROXY\s*=/i.test(value)) {
      value = value.replace(/^YT_DLP_PROXY\s*=\s*/i, '').trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (!value || /[\r\n\t ]/.test(value)) return null;

    const prefixedProviderFormat = value.match(
      /^(https?|socks4|socks5|socks5h):\/\/([^:/@]+):([^:/@]+):([^:/@]+):(\d+)$/i,
    );
    if (prefixedProviderFormat) {
      const [, scheme, username, password, host, port] = prefixedProviderFormat;
      value = `${scheme.toLowerCase()}://${encodeURIComponent(
        username,
      )}:${encodeURIComponent(password)}@${host}:${port}`;
    } else if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
      const providerFormat = value.match(/^([^:@/]+):(\d+):([^:]+):(.+)$/);
      if (providerFormat) {
        const [, host, port, username, password] = providerFormat;
        value = `http://${encodeURIComponent(username)}:${encodeURIComponent(
          password,
        )}@${host}:${port}`;
      } else {
        value = `http://${value}`;
      }
    }

    try {
      const parsed = new URL(value);
      const supportedProtocols = new Set([
        'http:',
        'https:',
        'socks4:',
        'socks5:',
        'socks5h:',
      ]);
      if (
        !supportedProtocols.has(parsed.protocol) ||
        !parsed.hostname ||
        parsed.search ||
        parsed.hash ||
        (parsed.pathname && parsed.pathname !== '/')
      ) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  private isProxyParseError(detail: string) {
    const lower = detail.toLowerCase();
    return lower.includes('failed to parse') || lower.includes('invalid proxy');
  }

  private ytDlpInvalidProxyError(detail: string, directRetryFailed = false) {
    return (
      'YT_DLP_PROXY không hợp lệ. Hãy dùng định dạng ' +
      'http://user:password@host:port (không đặt trong dấu ngoặc kép). ' +
      `${directRetryFailed ? 'Kết nối trực tiếp cũng thất bại' : 'Chi tiết'}: ${detail.slice(0, 350)}`
    );
  }

  /**
   * Cookies Netscape cho yt-dlp (bắt buộc trên nhiều host production).
   * Ưu tiên file path; fallback ghi từ env base64 vào storage/.
   */
  private resolveYtDlpCookiesPath(): string | null {
    const configured = this.config.get<string>('YT_DLP_COOKIES_PATH')?.trim();
    if (configured) {
      if (existsSync(configured)) return configured;
      this.logger.warn(`YT_DLP_COOKIES_PATH không tồn tại: ${configured}`);
    }

    const base64 = this.config.get<string>('YT_DLP_COOKIES_BASE64')?.trim();
    if (!base64) return null;

    try {
      const content = Buffer.from(base64, 'base64').toString('utf8').trim();
      if (!content || content.length < 20) {
        this.logger.warn('YT_DLP_COOKIES_BASE64 rỗng hoặc không hợp lệ');
        return null;
      }

      const outDir = join(process.cwd(), 'storage');
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, 'youtube-cookies.txt');
      writeFileSync(outPath, `${content}\n`, { encoding: 'utf8', mode: 0o600 });
      return outPath;
    } catch (error) {
      this.logger.warn(
        `Không ghi được cookies từ YT_DLP_COOKIES_BASE64: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private ytDlpUserFacingError(detail: string) {
    const lower = detail.toLowerCase();
    if (this.isProxyParseError(detail)) {
      return this.ytDlpInvalidProxyError(detail);
    }
    if (
      lower.includes('sign in to confirm') ||
      lower.includes("you're not a bot") ||
      lower.includes('not a bot') ||
      lower.includes('cookies-from-browser')
    ) {
      return (
        'YouTube chặn tải audio từ server (bot check). ' +
        'Cần cấu hình cookies YouTube trên production: ' +
        'YT_DLP_COOKIES_PATH hoặc YT_DLP_COOKIES_BASE64. ' +
        'Xem backend/tools/README.md.'
      );
    }

    return `Không tải được audio YouTube. Chi tiết: ${detail.slice(0, 500)}`;
  }

  private commandErrorDetail(error: unknown) {
    const commandError = error as Partial<CommandExecutionError> | undefined;
    const stderr = this.commandOutput(commandError?.stderr);
    const stdout = this.commandOutput(commandError?.stdout);
    const fallback = error instanceof Error ? error.message : String(error);
    const output = stderr || stdout || fallback;
    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const explicitError = lines.filter((line) => /^error:/i.test(line)).at(-1);

    return this.redactCommandSecrets(
      (explicitError || lines.at(-1) || output).replace(/\s+/g, ' ').trim(),
    );
  }

  private commandErrorLog(error: unknown) {
    const commandError = error as Partial<CommandExecutionError> | undefined;
    return this.redactCommandSecrets(
      this.commandOutput(commandError?.stderr) ||
        this.commandOutput(commandError?.stdout) ||
        (error instanceof Error ? error.message : String(error)),
    );
  }

  private redactCommandSecrets(value: string) {
    const configuredProxy = this.config.get<string>('YT_DLP_PROXY')?.trim();
    const normalizedProxy = this.normalizeYtDlpProxy(configuredProxy);
    return [configuredProxy, normalizedProxy]
      .filter((proxy): proxy is string => Boolean(proxy))
      .reduce(
        (redacted, proxy) => redacted.split(proxy).join('[redacted proxy]'),
        value,
      );
  }

  private commandOutput(output: string | Buffer | undefined) {
    return output ? String(output).trim() : '';
  }

  private localToolCandidates(...names: string[]) {
    const projectRoots = [
      process.cwd(),
      join(__dirname, '..', '..'),
      join(__dirname, '..', '..', '..'),
    ];

    return Array.from(
      new Set(
        projectRoots.flatMap((root) =>
          names.map((name) => join(root, 'tools', name)),
        ),
      ),
    );
  }

  private async runFfmpeg(args: string[]) {
    const ffmpeg = this.resolveFfmpegPath();
    try {
      await execFileAsync(ffmpeg, args, {
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error) {
      const detail = this.commandErrorDetail(error);
      this.logger.error(`ffmpeg failed: ${this.commandErrorLog(error)}`);
      throw new ServiceUnavailableException(
        `ffmpeg lỗi: ${detail.slice(0, 600)}`,
      );
    }
  }

  private serializeJob(job: {
    id: string;
    youtubeVideoId: string | null;
    youtubeUrl: string | null;
    originalFilename?: string | null;
    mediaUrl?: string | null;
    title: string | null;
    thumbnailUrl: string | null;
    durationSec: number | null;
    status: VideoTranslateStatus;
    source: string | null;
    errorMessage: string | null;
    segmentsJson: Prisma.JsonValue | null;
    dubbedAudioUrl: string | null;
    pipelineVersion?: number;
    fromCache: boolean;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      youtubeVideoId: job.youtubeVideoId,
      youtubeUrl: job.youtubeUrl,
      originalFilename: job.originalFilename ?? null,
      mediaUrl: job.mediaUrl ?? null,
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

  private parseSegments(value: Prisma.JsonValue | null): VideoSegment[] {
    if (!value || !Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const start = Number(row.start);
        const end = Number(row.end);
        const en = typeof row.en === 'string' ? row.en : '';
        const vi = typeof row.vi === 'string' ? row.vi : '';
        const words = Array.isArray(row.words)
          ? row.words
              .map((word) => {
                if (!word || typeof word !== 'object') return null;
                const value = word as Record<string, unknown>;
                const text = typeof value.text === 'string' ? value.text : '';
                const wordStart = Number(value.start);
                const wordEnd = Number(value.end);
                if (!text || !Number.isFinite(wordStart)) return null;
                return {
                  text,
                  start: wordStart,
                  end: Number.isFinite(wordEnd)
                    ? Math.max(wordStart, wordEnd)
                    : wordStart + 0.12,
                };
              })
              .filter((word): word is VideoWordTiming => word != null)
          : [];
        if (!Number.isFinite(start) || !en) return null;
        return {
          start,
          end: Number.isFinite(end) ? end : start + 2,
          en,
          vi,
          ...(words.length ? { words } : {}),
        };
      })
      .filter((item): item is VideoSegment => item != null);
  }

  private resolvePremium(user: {
    isPremium: boolean;
    premiumExpiresAt: Date | null;
  }) {
    if (!user.isPremium) return false;
    if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
      return false;
    }
    return true;
  }

  private usageDate() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private nextResetAt() {
    const date = this.usageDate();
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private maxSecondsFree() {
    const raw = Number(
      this.config.get<string>('VIDEO_TRANSLATE_MAX_SECONDS_FREE'),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_SECONDS_FREE;
  }

  private maxSecondsPremium() {
    const raw = Number(
      this.config.get<string>('VIDEO_TRANSLATE_MAX_SECONDS_PREMIUM'),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_SECONDS_PREMIUM;
  }

  private translationBatchSize() {
    return this.boundedConfigNumber(
      'VIDEO_TRANSLATE_BATCH_SIZE',
      DEFAULT_TRANSLATION_BATCH_SIZE,
      6,
      40,
    );
  }

  private translationConcurrency() {
    return this.boundedConfigNumber(
      'VIDEO_TRANSLATE_CONCURRENCY',
      DEFAULT_TRANSLATION_CONCURRENCY,
      1,
      6,
    );
  }

  private boundedConfigNumber(
    key: string,
    fallback: number,
    min: number,
    max: number,
  ) {
    const configured = this.config.get<string>(key);
    if (configured == null || String(configured).trim() === '') return fallback;
    const raw = Number(configured);
    if (!Number.isFinite(raw)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(raw)));
  }

  private async getTodayUsage(userId: string) {
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

  private async assertAndReserveQuota(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    });
    if (this.resolvePremium(user)) return;

    const usageDate = this.usageDate();
    const reserved = await this.prisma.$transaction(async (tx) => {
      await tx.videoTranslateDailyUsage.upsert({
        where: { userId_usageDate: { userId, usageDate } },
        create: { userId, usageDate, videoCount: 0 },
        update: {},
      });

      const updated = await tx.$queryRaw<Array<{ video_count: number }>>`
        UPDATE video_translate_daily_usage
        SET video_count = video_count + 1, updated_at = NOW()
        WHERE user_id = ${userId}
          AND usage_date = ${usageDate}
          AND video_count < ${FREE_VIDEO_TRANSLATE_PER_DAY}
        RETURNING video_count
      `;

      return updated[0] ?? null;
    });

    if (!reserved) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Bạn đã hết 3 video miễn phí hôm nay. Nâng cấp Premium để dịch không giới hạn.',
        code: 'VIDEO_TRANSLATE_QUOTA_EXCEEDED',
      });
    }
  }

  private async releaseQuotaReservation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    });
    if (!user || this.resolvePremium(user)) return;

    const usageDate = this.usageDate();
    await this.prisma.$executeRaw`
      UPDATE video_translate_daily_usage
      SET video_count = GREATEST(video_count - 1, 0), updated_at = NOW()
      WHERE user_id = ${userId} AND usage_date = ${usageDate}
    `;
  }

  private ensureOpenAi() {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY chưa cấu hình — không thể dịch video',
      );
    }
  }
}
