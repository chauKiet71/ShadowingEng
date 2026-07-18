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
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import OpenAI, { toFile } from 'openai';
import { fetchTranscript } from 'youtube-transcript';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractYoutubeVideoId,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from './youtube.util';

export const FREE_VIDEO_TRANSLATE_PER_DAY = 3;
export const DEFAULT_MAX_SECONDS_FREE = 480;
export const DEFAULT_MAX_SECONDS_PREMIUM = 1200;
/** Bump when processing pipeline changes — old cache bị bỏ qua */
export const DUBBED_PIPELINE_VERSION = 8;

/**
 * Quy tắc tạo transcript: mỗi thẻ = một câu nói tự nhiên.
 * Ví dụ hợp lệ: "Let me check."
 * Ví dụ cấm: tách "Let" và "me check." thành 2 thẻ.
 *
 * Cắt thẻ mới khi: đã nói hết câu (đủ từ / có dấu kết thúc) và nghỉ ≥ 0.5s.
 */
const TRANSCRIPT_RULES = {
  /** Không để thẻ dưới số từ này nếu còn mảnh gần kề */
  minWordsPerCard: 4,
  /** Nghỉ ≥ mức này sau khi câu đủ dài → cắt thẻ mới (giây) */
  pauseBreakSec: 0.5,
  /** Chỉ dùng để dán mảnh quá ngắn (vd. "Let") — không vượt pauseBreak cho câu đủ dài */
  shortFragmentMergeGapSec: 1.0,
  /** Giới hạn độ dài một thẻ */
  maxWordsPerCard: 18,
  maxUtteranceSec: 8,
} as const;

const execFileAsync = promisify(execFile);

export type VideoSegment = {
  start: number;
  end: number;
  en: string;
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
      maxSeconds: isPremium
        ? this.maxSecondsPremium()
        : this.maxSecondsFree(),
    };
  }

  async listJobs(userId: string) {
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

  async resolveDubbedFilePath(userId: string, jobId: string) {
    const job = await this.prisma.videoTranslateJob.findFirst({
      where: { id: jobId, userId },
      select: { dubbedAudioUrl: true, status: true },
    });
    if (!job || job.status !== VideoTranslateStatus.READY || !job.dubbedAudioUrl) {
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

  async createJob(userId: string, rawUrl: string) {
    this.ensureOpenAi();

    const videoId = extractYoutubeVideoId(rawUrl);
    if (!videoId) {
      throw new BadRequestException(
        'Link YouTube không hợp lệ. Dán URL dạng youtube.com/watch?v=... hoặc youtu.be/...',
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
      const cloned = await this.prisma.videoTranslateJob.create({
        data: {
          userId,
          youtubeVideoId: videoId,
          youtubeUrl,
          title: cached.title,
          thumbnailUrl: cached.thumbnailUrl ?? youtubeThumbnailUrl(videoId),
          durationSec: cached.durationSec,
          status: VideoTranslateStatus.READY,
          source: cached.source,
          segmentsJson: cached.segmentsJson ?? Prisma.JsonNull,
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
          thumbnailUrl: youtubeThumbnailUrl(videoId),
          status: VideoTranslateStatus.PENDING,
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
          thumbnailUrl: meta.thumbnailUrl ?? youtubeThumbnailUrl(job.youtubeVideoId),
        },
      });

      const { segments: timed, source } = await this.getTimedTranscript(
        job.youtubeVideoId,
        job.youtubeUrl,
        workDir,
        meta.durationSec,
      );

      const translated = await this.translateSegments(timed);

      await this.prisma.videoTranslateJob.update({
        where: { id: jobId },
        data: {
          status: VideoTranslateStatus.READY,
          source,
          segmentsJson: translated as unknown as Prisma.InputJsonValue,
          dubbedAudioUrl: null,
          pipelineVersion: DUBBED_PIPELINE_VERSION,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
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
        // keep final dubbed.mp3 under jobDir
      }
    }
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

  private async tryFetchCaptions(videoId: string, durationSec: number) {
    try {
      let items = await fetchTranscript(videoId, { lang: 'en' });
      if (!items?.length) {
        items = await fetchTranscript(videoId);
      }
      if (!items?.length) return [];

      const maxOffset = Math.max(
        ...items.map((item) => Number(item.offset) || 0),
      );
      const unitIsMs = maxOffset > durationSec * 1.5 + 5;

      return items
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
    } catch (error) {
      this.logger.warn(
        `Caption fetch failed for ${videoId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
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
   * Áp dụng TRANSCRIPT_RULES: gộp từ/mảnh → câu hoàn chỉnh, căn timing.
   */
  private finalizeSegments(
    segments: Array<{ start: number; end: number; en: string }>,
    durationSec: number,
  ) {
    const sorted = [...segments].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    );
    const collapsed = this.collapseRollingCaptions(sorted);
    const utterances = this.mergeIntoUtterances(collapsed);
    const glued = this.enforceMinWordsPerCard(utterances);
    const split = this.splitMultiSentence(glued);
    const repaired = this.enforceMinWordsPerCard(split);
    return this.alignSegmentWindows(repaired, durationSec).filter(
      (seg) => seg.en.trim().length > 0,
    );
  }

  private wordCount(text: string) {
    return text.split(/\s+/).filter(Boolean).length;
  }

  private endsUtterance(text: string) {
    return /[.!?…]["')\]]?\s*$/.test(text.trim());
  }

  private joinSegmentText(left: string, right: string) {
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

  private mergeTwoSegments(
    a: { start: number; end: number; en: string },
    b: { start: number; end: number; en: string },
  ) {
    const aWords = this.wordCount(a.en);
    const bWords = this.wordCount(b.en);
    // Lệch thứ tự: "me check." rồi mới "Let" → "Let me check."
    const reorder =
      this.endsUtterance(a.en) &&
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

      const lastLower = last.en.toLowerCase();
      const nextLower = seg.en.toLowerCase();
      const overlaps = seg.start <= last.end + 0.25;
      const isExtension =
        nextLower.startsWith(lastLower) ||
        nextLower.includes(lastLower) ||
        lastLower.includes(nextLower);

      if (overlaps && isExtension) {
        last.end = Math.max(last.end, seg.end);
        if (seg.en.length >= last.en.length) last.en = seg.en;
        continue;
      }

      out.push({ ...seg });
    }

    return out;
  }

  /**
   * Quy tắc gộp chính:
   * - Nghỉ ≥ 0.5s sau câu đủ dài → cắt thẻ mới
   * - Thẻ dưới minWordsPerCard → vẫn dính mảnh kế (tránh "Let" / "me check.")
   */
  private mergeIntoUtterances(
    segments: Array<{ start: number; end: number; en: string }>,
  ) {
    const {
      minWordsPerCard,
      pauseBreakSec,
      shortFragmentMergeGapSec,
      maxWordsPerCard,
      maxUtteranceSec,
    } = TRANSCRIPT_RULES;
    const merged: Array<{ start: number; end: number; en: string }> = [];

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
      const lastCompleteEnough =
        lastWords >= minWordsPerCard || (lastEnded && lastWords >= 3);
      const lastTooShort = lastWords < minWordsPerCard;

      const canFit =
        combinedWords <= maxWordsPerCard && combinedDur <= maxUtteranceSec;

      // Đã hết câu + nghỉ ≥ 0.5s → cắt ngay
      if (lastCompleteEnough && gap >= pauseBreakSec) {
        if (
          lastEnded &&
          lastWords <= 4 &&
          words <= 4 &&
          gap < shortFragmentMergeGapSec &&
          /^[a-z]/.test(last.en.trim()) &&
          /^[A-Z]/.test(seg.en.trim())
        ) {
          const joined = this.mergeTwoSegments(last, seg);
          last.start = joined.start;
          last.end = joined.end;
          last.en = joined.en;
          continue;
        }
        merged.push({ ...seg });
        continue;
      }

      // Mảnh ngắn: vẫn gộp (tránh tách từ)
      const mustGlueShort =
        lastTooShort && gap < shortFragmentMergeGapSec && canFit;

      const continueSameSentence =
        canFit &&
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

  /** Ép quy tắc minWordsPerCard: không sót thẻ 1–3 từ. */
  private enforceMinWordsPerCard(
    segments: Array<{ start: number; end: number; en: string }>,
  ) {
    const {
      minWordsPerCard,
      pauseBreakSec,
      shortFragmentMergeGapSec,
      maxWordsPerCard,
    } = TRANSCRIPT_RULES;
    let merged = [...segments.map((seg) => ({ ...seg }))];

    const forward: Array<{ start: number; end: number; en: string }> = [];
    for (const seg of merged) {
      const last = forward[forward.length - 1];
      if (!last) {
        forward.push(seg);
        continue;
      }

      const gap = seg.start - last.end;
      const lastWords = this.wordCount(last.en);
      const words = this.wordCount(seg.en);
      const lastCompleteEnough =
        lastWords >= minWordsPerCard ||
        (this.endsUtterance(last.en) && lastWords >= 3);

      // Không dán ngược qua nghỉ 0.5s nếu câu trước đã đủ
      if (lastCompleteEnough && gap >= pauseBreakSec) {
        forward.push(seg);
        continue;
      }

      const close =
        gap < shortFragmentMergeGapSec || seg.start - last.start < 5;
      const needGlue =
        close &&
        lastWords + words <= maxWordsPerCard &&
        (lastWords < minWordsPerCard ||
          words < minWordsPerCard ||
          (!this.endsUtterance(last.en) && lastWords < minWordsPerCard + 2));

      if (needGlue) {
        const joined = this.mergeTwoSegments(last, seg);
        last.start = joined.start;
        last.end = joined.end;
        last.en = joined.en;
      } else {
        forward.push(seg);
      }
    }

    merged = [];
    for (let i = 0; i < forward.length; i += 1) {
      const cur = forward[i];
      const next = forward[i + 1];
      if (
        next &&
        this.wordCount(cur.en) < minWordsPerCard &&
        !this.endsUtterance(cur.en) &&
        next.start - cur.end < shortFragmentMergeGapSec
      ) {
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

  private splitMultiSentence(
    segments: Array<{ start: number; end: number; en: string }>,
  ) {
    const { minWordsPerCard } = TRANSCRIPT_RULES;
    const out: Array<{ start: number; end: number; en: string }> = [];

    for (const seg of segments) {
      const parts = seg.en
        .split(/(?<=[.!?…])\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

      // Không tách nếu tạo ra mảnh dưới minWordsPerCard
      if (
        parts.length <= 1 ||
        parts.some((part) => this.wordCount(part) < minWordsPerCard)
      ) {
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
          index === parts.length - 1 ? seg.end : Math.min(seg.end, cursor + dur);
        out.push({ start: cursor, end, en: part });
        cursor = end;
      });
    }

    return out;
  }

  /** Kéo end tới gần start câu sau để highlight không tắt giữa câu. */
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
        if (gap <= 2.5) {
          end = Math.max(seg.start + 0.35, nextStart - 0.04);
        } else {
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

  private async translateSegments(
    segments: Array<{ start: number; end: number; en: string }>,
  ): Promise<VideoSegment[]> {
    this.ensureOpenAi();
    const out: VideoSegment[] = [];
    const batchSize = 12;

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const payload = batch.map((seg, idx) => ({
        i: idx,
        en: seg.en,
      }));

      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You translate English video transcript segments into concise natural Vietnamese for learners. Keep meaning, prefer shorter phrasing so spoken length stays close to English. Return JSON: {"items":[{"i":0,"vi":"..."}]}. No explanations.',
          },
          {
            role: 'user',
            content: JSON.stringify({ items: payload }),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      let map = new Map<number, string>();
      try {
        const parsed = JSON.parse(raw) as {
          items?: Array<{ i: number; vi: string }>;
        };
        for (const item of parsed.items ?? []) {
          if (typeof item?.vi === 'string') map.set(item.i, item.vi.trim());
        }
      } catch {
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

  private async translateOne(text: string) {
    this.ensureOpenAi();
    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Translate English into natural Vietnamese. Return only the translation.',
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
      const windowEnd = Math.max(seg.start + 0.35, Math.min(seg.end + 0.15, nextStart - 0.04));
      const targetDur = Math.max(0.35, windowEnd - seg.start);

      const buffer = await this.synthesizeVietnamese(seg.vi);
      const rawPath = join(partsDir, `raw-${String(i).padStart(3, '0')}.mp3`);
      const fittedPath = join(partsDir, `fit-${String(i).padStart(3, '0')}.mp3`);
      writeFileSync(rawPath, buffer);
      await this.fitSpeechToWindow(rawPath, fittedPath, targetDur);

      partFiles.push({
        path: fittedPath,
        delayMs: Math.max(0, Math.round(seg.start * 1000)),
      });
    }

    if (partFiles.length === 0) {
      throw new BadRequestException('Không tạo được audio tiếng Việt từ transcript');
    }

    mkdirSync(jobDir, { recursive: true });
    const outPath = join(jobDir, 'dubbed.mp3');
    const silencePath = join(workDir, 'silence.mp3');
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
      const match = String(stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
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
      return (
        Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
      );
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
        instructions: 'Speak clear Vietnamese at a natural conversational pace.',
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
    const outTemplate = join(workDir, 'audio.%(ext)s');
    try {
      await execFileAsync(
        ytDlp,
        [
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
        ],
        { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 },
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `Không tải được audio YouTube. Kiểm tra yt-dlp/ffmpeg. Chi tiết: ${detail.slice(0, 240)}`,
      );
    }

    const files = readdirSync(workDir).filter((name) =>
      /^audio\.(mp3|m4a|webm|opus|wav)$/i.test(name),
    );
    if (!files.length) {
      throw new ServiceUnavailableException('Không tìm thấy file audio sau khi tải');
    }
    return join(workDir, files[0]);
  }

  private async transcribeWithWhisper(audioPath: string) {
    this.ensureOpenAi();
    const buffer = readFileSync(audioPath);
    const file = await toFile(buffer, 'audio.mp3', { type: 'audio/mpeg' });
    const result = await this.openai!.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const segments =
      (
        result as unknown as {
          segments?: Array<{ start?: number; end?: number; text?: string }>;
        }
      ).segments ?? [];

    if (!segments.length && (result as { text?: string }).text) {
      return [
        {
          start: 0,
          end: 4,
          en: String((result as { text?: string }).text).trim(),
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

  private async fetchVideoMeta(videoId: string, youtubeUrl: string) {
    try {
      const ytDlp = this.resolveYtDlpPath();
      const { stdout } = await execFileAsync(
        ytDlp,
        ['--dump-json', '--no-playlist', youtubeUrl],
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
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
        );
        if (res.ok) {
          const data = (await res.json()) as { title?: string; thumbnail_url?: string };
          return {
            title: data.title?.trim() || `YouTube ${videoId}`,
            durationSec: this.maxSecondsFree(),
            thumbnailUrl: data.thumbnail_url || youtubeThumbnailUrl(videoId),
          };
        }
      } catch {
        // ignore
      }
      return {
        title: `YouTube ${videoId}`,
        durationSec: this.maxSecondsFree(),
        thumbnailUrl: youtubeThumbnailUrl(videoId),
      };
    }
  }

  private resolveYtDlpPath() {
    const configured = this.config.get<string>('YT_DLP_PATH')?.trim();
    if (configured && existsSync(configured)) return configured;

    const local = join(process.cwd(), 'tools', 'yt-dlp.exe');
    if (existsSync(local)) return local;

    const unixLocal = join(process.cwd(), 'tools', 'yt-dlp');
    if (existsSync(unixLocal)) return unixLocal;

    return 'yt-dlp';
  }

  private resolveFfmpegPath() {
    const configured = this.config.get<string>('FFMPEG_PATH')?.trim();
    if (configured && existsSync(configured)) return configured;
    return 'ffmpeg';
  }

  private async runFfmpeg(args: string[]) {
    const ffmpeg = this.resolveFfmpegPath();
    try {
      await execFileAsync(ffmpeg, args, {
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `ffmpeg lỗi: ${detail.slice(0, 240)}`,
      );
    }
  }

  private serializeJob(job: {
    id: string;
    youtubeVideoId: string;
    youtubeUrl: string;
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
        if (!Number.isFinite(start) || !en) return null;
        return {
          start,
          end: Number.isFinite(end) ? end : start + 2,
          en,
          vi,
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
