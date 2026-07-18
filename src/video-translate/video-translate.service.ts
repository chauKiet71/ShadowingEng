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
import ffmpegStaticPath from 'ffmpeg-static';
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
export const DUBBED_PIPELINE_VERSION = 9;

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
  /** Giới hạn độ dài một thẻ */
  maxWordsPerCard: 18,
  maxUtteranceSec: 8,
} as const;

const execFileAsync = promisify(execFile);

type CommandExecutionError = Error & {
  stderr?: string | Buffer;
  stdout?: string | Buffer;
};

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
      maxSeconds: isPremium ? this.maxSecondsPremium() : this.maxSecondsFree(),
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

  async deleteJob(userId: string, jobId: string) {
    const job = await this.prisma.videoTranslateJob.findFirst({
      where: { id: jobId, userId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Không tìm thấy job dịch video');

    await this.prisma.videoTranslateJob.delete({
      where: { id: job.id },
    });

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

      const meta = await this.fetchVideoMeta(
        job.youtubeVideoId,
        job.youtubeUrl,
      );
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
          thumbnailUrl:
            meta.thumbnailUrl ?? youtubeThumbnailUrl(job.youtubeVideoId),
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
          segmentsJson: translated,
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
    const sentenceParts = this.splitMultiSentence(collapsed);
    const utterances = this.mergeIntoUtterances(sentenceParts);
    return this.alignSegmentWindows(utterances, durationSec).filter(
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
    const {
      pauseBreakSec,
      timestampEpsilonSec,
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

      const canFit =
        combinedWords <= maxWordsPerCard && combinedDur <= maxUtteranceSec;

      if (gap + timestampEpsilonSec >= pauseBreakSec || lastEnded || !canFit) {
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
    try {
      await execFileAsync(
        ytDlp,
        [
          '--js-runtimes',
          'node',
          ...connectionArgs,
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
    } catch (error) {
      const detail = this.commandErrorDetail(error);
      this.logger.error(
        `yt-dlp download failed: ${this.commandErrorLog(error)}`,
      );
      throw new ServiceUnavailableException(
        `Không tải được audio YouTube. Chi tiết: ${detail.slice(0, 600)}`,
      );
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
    const buffer = readFileSync(audioPath);
    const file = await toFile(buffer, 'audio.mp3', { type: 'audio/mpeg' });
    const result = await this.openai!.audio.transcriptions.create({
      file,
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
    const words = timedResult.words ?? [];
    if (words.length) {
      return words
        .map((word) => ({
          start: Number(word.start) || 0,
          end: Number(word.end) || (Number(word.start) || 0) + 0.3,
          en: this.cleanCaptionText(String(word.word ?? '')),
        }))
        .filter((word) => word.en.length > 0);
    }

    const segments = timedResult.segments ?? [];
    if (!segments.length && timedResult.text) {
      return [
        {
          start: 0,
          end: 4,
          en: String(timedResult.text).trim(),
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
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            title?: string;
            thumbnail_url?: string;
          };
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

  private ytDlpConnectionArgs() {
    const args: string[] = [];
    const proxy = this.config.get<string>('YT_DLP_PROXY')?.trim();
    const cookiesPath = this.config.get<string>('YT_DLP_COOKIES_PATH')?.trim();
    const forceIpv4 =
      this.config.get<string>('YT_DLP_FORCE_IPV4')?.trim().toLowerCase() ===
      'true';

    if (proxy) args.push('--proxy', proxy);
    if (cookiesPath) args.push('--cookies', cookiesPath);
    if (forceIpv4) args.push('--force-ipv4');

    return args;
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
    const proxy = this.config.get<string>('YT_DLP_PROXY')?.trim();
    return proxy ? value.split(proxy).join('[redacted proxy]') : value;
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
