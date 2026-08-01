import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CefrLevel, VocabularyProgressStatus } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import type { LookupVocabularyWordDto } from './dto/vocabulary.dto';
import {
  TECH_VOCABULARY_SETS,
  type VocabularySeedSet,
} from './vocabulary-tech-sets';
import { TRAVEL_VOCABULARY_SET } from './vocabulary-travel-set';
import { DAILY_VOCABULARY_SET } from './vocabulary-daily-set';
import { MOVIE_VOCABULARY_SET } from './vocabulary-movie-set';
import { OFFICE_VOCABULARY_SET } from './vocabulary-office-set';
import { EDUCATION_VOCABULARY_SET } from './vocabulary-education-set';
import { ECONOMY_VOCABULARY_SET } from './vocabulary-economy-set';
import { BUSINESS_VOCABULARY_SET } from './vocabulary-business-set';
import { BANKING_VOCABULARY_SET } from './vocabulary-banking-set';
import { FINANCE_VOCABULARY_SET } from './vocabulary-finance-set';
import { COMMON_VOCABULARY_SET } from './vocabulary-common-set';

const SETS: VocabularySeedSet[] = [
  COMMON_VOCABULARY_SET,
  TRAVEL_VOCABULARY_SET,
  DAILY_VOCABULARY_SET,
  OFFICE_VOCABULARY_SET,
  MOVIE_VOCABULARY_SET,
  ...TECH_VOCABULARY_SETS,
  EDUCATION_VOCABULARY_SET,
  ECONOMY_VOCABULARY_SET,
  BUSINESS_VOCABULARY_SET,
  BANKING_VOCABULARY_SET,
  FINANCE_VOCABULARY_SET,
];

const LISTENING_WORDS_SET_SLUG = 'tu-vung-tu-bai-nghe';

type GeneratedWordDetail = {
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  meaning: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  synonyms: string[];
  relatedWords: Array<{ word: string; note: string }>;
};

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);
  private catalogSync: Promise<void> | null = null;
  private readonly lookupRequests = new Map<
    string,
    Promise<GeneratedWordDetail>
  >();
  private readonly lookupDetailCache = new Map<string, GeneratedWordDetail>();
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private normalizeLookupWord(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/^[^a-z'-]+|[^a-z'-]+$/g, '')
      .slice(0, 64);
  }

  private lookupCandidates(word: string) {
    const candidates = new Set([word]);
    if (word.endsWith("'s")) candidates.add(word.slice(0, -2));
    if (word.endsWith('ies') && word.length > 4) {
      candidates.add(`${word.slice(0, -3)}y`);
    }
    if (word.endsWith('ing') && word.length > 5) {
      const stem = word.slice(0, -3);
      candidates.add(stem);
      candidates.add(`${stem}e`);
      if (stem.at(-1) === stem.at(-2)) candidates.add(stem.slice(0, -1));
    }
    if (word.endsWith('ed') && word.length > 4) {
      const stem = word.slice(0, -2);
      candidates.add(stem);
      candidates.add(`${stem}e`);
    }
    if (word.endsWith('s') && word.length > 3)
      candidates.add(word.slice(0, -1));
    return [...candidates].filter(Boolean);
  }

  private ensureCatalog() {
    if (!this.catalogSync) {
      this.catalogSync = this.syncCatalog().catch((error) => {
        this.catalogSync = null;
        throw error;
      });
    }
    return this.catalogSync;
  }

  private async syncCatalog() {
    const keepSlugs = SETS.map((set) => set.slug);

    await this.prisma.vocabularySet.deleteMany({
      where: {
        slug: {
          startsWith: 'cong-nghe-',
          notIn: keepSlugs,
        },
      },
    });

    const existing = await this.prisma.vocabularySet.findMany({
      where: { slug: { in: keepSlugs } },
      select: {
        id: true,
        slug: true,
        _count: { select: { words: true } },
      },
    });
    const bySlug = new Map(existing.map((set) => [set.slug, set]));
    const alreadySynced = SETS.every((set) => {
      const found = bySlug.get(set.slug);
      return !!found && found._count.words === set.words.length;
    });
    if (alreadySynced) return;

    for (const set of SETS) {
      const current = bySlug.get(set.slug);
      if (current && current._count.words === set.words.length) {
        await this.prisma.vocabularySet.update({
          where: { id: current.id },
          data: {
            title: set.title,
            description: set.description,
            icon: set.icon,
            color: set.color,
            cefrLevel: set.cefrLevel,
            topic: set.topic,
            isFeatured: set.isFeatured,
            sortOrder: set.sortOrder,
          },
        });
        continue;
      }

      const vocabularySet = await this.prisma.vocabularySet.upsert({
        where: { slug: set.slug },
        create: {
          slug: set.slug,
          title: set.title,
          description: set.description,
          icon: set.icon,
          color: set.color,
          cefrLevel: set.cefrLevel,
          topic: set.topic,
          isFeatured: set.isFeatured,
          sortOrder: set.sortOrder,
        },
        update: {
          title: set.title,
          description: set.description,
          icon: set.icon,
          color: set.color,
          cefrLevel: set.cefrLevel,
          topic: set.topic,
          isFeatured: set.isFeatured,
          sortOrder: set.sortOrder,
        },
      });

      await this.prisma.vocabularyWord.deleteMany({
        where: { setId: vocabularySet.id },
      });

      await this.prisma.vocabularyWord.createMany({
        data: set.words.map((word, index) => ({
          setId: vocabularySet.id,
          word: word[0],
          phonetic: word[1],
          meaning: word[2],
          example: word[3],
          exampleTranslation: word[4],
          sortOrder: index + 1,
        })),
      });
    }
  }

  async getOverview(userId?: string) {
    await this.ensureCatalog();
    if (!userId) {
      const sets = await this.prisma.vocabularySet.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { words: true } } },
      });

      return {
        stats: {
          totalLearned: 0,
          mastered: 0,
          learning: 0,
          dueCount: 0,
          learnedToday: 0,
        },
        sets: sets.map((set) => ({
          id: set.id,
          slug: set.slug,
          title: set.title,
          description: set.description,
          icon: set.icon,
          color: set.color,
          cefrLevel: set.cefrLevel,
          topic: set.topic,
          isFeatured: set.isFeatured,
          wordCount: set._count.words,
          learnedCount: 0,
          saved: false,
        })),
        mySets: [],
        dueWords: [],
      };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalLearned,
      mastered,
      dueCount,
      learnedToday,
      sets,
      mySets,
      dueWords,
      learnedProgress,
    ] = await Promise.all([
      this.prisma.userVocabularyProgress.count({ where: { userId } }),
      this.prisma.userVocabularyProgress.count({
        where: { userId, status: VocabularyProgressStatus.MASTERED },
      }),
      this.prisma.userVocabularyProgress.count({
        where: { userId, nextReviewAt: { lte: now } },
      }),
      this.prisma.userVocabularyProgress.count({
        where: { userId, learnedAt: { gte: startOfDay } },
      }),
      this.prisma.vocabularySet.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { words: true } },
          savedBy: { where: { userId }, select: { id: true } },
        },
      }),
      this.prisma.userVocabularySet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          set: {
            include: { _count: { select: { words: true } } },
          },
        },
      }),
      this.prisma.userVocabularyProgress.findMany({
        where: { userId, nextReviewAt: { lte: now } },
        orderBy: { nextReviewAt: 'asc' },
        take: 20,
        include: { word: { include: { set: true } } },
      }),
      this.prisma.userVocabularyProgress.findMany({
        where: { userId },
        select: { word: { select: { setId: true } } },
      }),
    ]);

    const learnedCountBySet = new Map<string, number>();
    for (const item of learnedProgress) {
      const setId = item.word.setId;
      learnedCountBySet.set(setId, (learnedCountBySet.get(setId) ?? 0) + 1);
    }

    return {
      stats: {
        totalLearned,
        mastered,
        learning: totalLearned - mastered,
        dueCount,
        learnedToday,
      },
      sets: sets.map((set) => ({
        id: set.id,
        slug: set.slug,
        title: set.title,
        description: set.description,
        icon: set.icon,
        color: set.color,
        cefrLevel: set.cefrLevel,
        topic: set.topic,
        isFeatured: set.isFeatured,
        wordCount: set._count.words,
        learnedCount: learnedCountBySet.get(set.id) ?? 0,
        saved: set.savedBy.length > 0,
      })),
      mySets: mySets.map(({ set }) => ({
        id: set.id,
        slug: set.slug,
        title: set.title,
        description: set.description,
        icon: set.icon,
        color: set.color,
        cefrLevel: set.cefrLevel,
        topic: set.topic,
        wordCount: set._count.words,
        learnedCount: learnedCountBySet.get(set.id) ?? 0,
        saved: true,
      })),
      dueWords: dueWords.map((progress) => ({
        ...progress.word,
        setTitle: progress.word.set.title,
        progress: {
          status: progress.status,
          reviewCount: progress.reviewCount,
          correctCount: progress.correctCount,
          nextReviewAt: progress.nextReviewAt,
        },
      })),
    };
  }

  async lookupWord(userId: string | undefined, input: LookupVocabularyWordDto) {
    await this.ensureCatalog();
    const requestedWord = this.normalizeLookupWord(input.word);
    if (!requestedWord) {
      throw new BadRequestException('Từ cần tra cứu không hợp lệ');
    }

    const cacheKey = `${requestedWord}\n${input.sentence.trim().toLowerCase()}`;
    const candidates = this.lookupCandidates(requestedWord);
    const existing = await this.prisma.vocabularyWord.findFirst({
      where: {
        OR: candidates.map((word) => ({
          word: { equals: word, mode: 'insensitive' as const },
        })),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        progress: {
          where: { userId: userId ?? '__guest__' },
          take: 1,
        },
      },
    });

    if (existing) {
      let enriched = this.lookupDetailCache.get(cacheKey) ?? null;
      if (!enriched && this.openai) {
        try {
          enriched = await this.getGeneratedWordDetail(
            cacheKey,
            requestedWord,
            input,
          );
        } catch {
          // Existing vocabulary remains usable when optional enrichment fails.
        }
      }

      return {
        id: existing.id,
        requestedWord,
        word: existing.word,
        phonetic: enriched?.phonetic ?? existing.phonetic,
        partOfSpeech: enriched?.partOfSpeech ?? null,
        meaning: enriched?.meaning ?? existing.meaning,
        definition: enriched?.definition ?? existing.meaning,
        example: enriched?.example ?? existing.example,
        exampleTranslation:
          enriched?.exampleTranslation ?? existing.exampleTranslation,
        audioUrl: existing.audioUrl,
        synonyms: enriched?.synonyms ?? [],
        relatedWords: enriched?.relatedWords ?? [],
        progress: existing.progress[0] ?? null,
        source: 'catalog' as const,
      };
    }

    const generated = await this.getGeneratedWordDetail(
      cacheKey,
      requestedWord,
      input,
    );
    const set = await this.prisma.vocabularySet.upsert({
      where: { slug: LISTENING_WORDS_SET_SLUG },
      create: {
        slug: LISTENING_WORDS_SET_SLUG,
        title: 'Từ vựng từ bài nghe',
        description: 'Những từ bạn đã tra cứu trong các bài luyện nghe.',
        icon: 'headphones',
        color: 'violet',
        cefrLevel: CefrLevel.A2,
        topic: 'Bài nghe',
        isFeatured: false,
        sortOrder: 999,
      },
      update: {},
    });

    const storedWord = await this.prisma.vocabularyWord.upsert({
      where: {
        setId_word: {
          setId: set.id,
          word: generated.word,
        },
      },
      create: {
        setId: set.id,
        word: generated.word,
        phonetic: generated.phonetic,
        meaning: generated.meaning,
        example: generated.example,
        exampleTranslation: generated.exampleTranslation,
        sortOrder: 0,
      },
      update: {
        phonetic: generated.phonetic,
        meaning: generated.meaning,
        example: generated.example,
        exampleTranslation: generated.exampleTranslation,
      },
    });

    return {
      id: storedWord.id,
      requestedWord,
      ...generated,
      audioUrl: storedWord.audioUrl,
      progress: null,
      source: 'generated' as const,
    };
  }

  private async getGeneratedWordDetail(
    cacheKey: string,
    requestedWord: string,
    input: LookupVocabularyWordDto,
  ) {
    const cached = this.lookupDetailCache.get(cacheKey);
    if (cached) return cached;

    let detailRequest = this.lookupRequests.get(cacheKey);
    if (!detailRequest) {
      detailRequest = this.generateWordDetail(requestedWord, input).finally(
        () => this.lookupRequests.delete(cacheKey),
      );
      this.lookupRequests.set(cacheKey, detailRequest);
    }

    const detail = await detailRequest;
    this.lookupDetailCache.set(cacheKey, detail);
    if (this.lookupDetailCache.size > 500) {
      const oldestKey = this.lookupDetailCache.keys().next().value as
        string | undefined;
      if (oldestKey) this.lookupDetailCache.delete(oldestKey);
    }
    return detail;
  }

  private async generateWordDetail(
    requestedWord: string,
    input: LookupVocabularyWordDto,
  ): Promise<GeneratedWordDetail> {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'Chưa thể tra cứu từ mới vì OPENAI_API_KEY chưa được cấu hình',
      );
    }

    try {
      const response = await this.openai.chat.completions.create({
        model:
          this.config.get<string>('VOCABULARY_LOOKUP_MODEL')?.trim() ||
          'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You create concise English vocabulary details for Vietnamese learners.',
              'Use the supplied sentence to choose the correct contextual meaning.',
              'Return only JSON with keys: word, phonetic, partOfSpeech, meaning, definition, example, exampleTranslation, synonyms, relatedWords.',
              'word must be the lowercase dictionary headword. phonetic must be IPA wrapped in slashes.',
              'partOfSpeech, meaning, definition, exampleTranslation, and relatedWords.note must be Vietnamese.',
              'synonyms must contain at most 4 English words. relatedWords must contain at most 3 objects with word and note.',
              'example must be one natural English sentence containing the headword or its inflected form.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              selectedWord: requestedWord,
              sentence: input.sentence.trim(),
              sentenceTranslation: input.sentenceTranslation.trim(),
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('AI returned an empty vocabulary detail');
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const text = (value: unknown, fallback = '') =>
        typeof value === 'string' && value.trim() ? value.trim() : fallback;
      const words = (value: unknown) =>
        Array.isArray(value)
          ? value
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 4)
          : [];
      const relatedWords = Array.isArray(parsed.relatedWords)
        ? parsed.relatedWords
            .map((item) => {
              if (!item || typeof item !== 'object') return null;
              const record = item as Record<string, unknown>;
              const word = text(record.word);
              if (!word) return null;
              return { word, note: text(record.note) };
            })
            .filter(
              (item): item is { word: string; note: string } => item != null,
            )
            .slice(0, 3)
        : [];
      const normalizedHeadword =
        this.normalizeLookupWord(text(parsed.word, requestedWord)) ||
        requestedWord;
      const meaning = text(parsed.meaning);
      if (!meaning)
        throw new Error('AI returned vocabulary detail without meaning');

      return {
        word: normalizedHeadword,
        phonetic: text(parsed.phonetic) || null,
        partOfSpeech: text(parsed.partOfSpeech) || null,
        meaning,
        definition: text(parsed.definition, meaning),
        example: text(parsed.example, input.sentence.trim()),
        exampleTranslation: text(
          parsed.exampleTranslation,
          input.sentenceTranslation.trim(),
        ),
        synonyms: words(parsed.synonyms),
        relatedWords,
      };
    } catch (error) {
      this.logger.error(
        `Vocabulary lookup failed for "${requestedWord}": ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Không thể tra cứu chi tiết từ vựng lúc này. Vui lòng thử lại.',
      );
    }
  }

  async getSets(userId?: string) {
    const overview = await this.getOverview(userId);
    return overview.sets;
  }

  async getSet(userId: string | undefined, id: string) {
    await this.ensureCatalog();
    if (!userId) {
      const set = await this.prisma.vocabularySet.findUnique({
        where: { id },
        include: {
          words: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (!set) {
        throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y bá»™ tá»« vá»±ng');
      }

      return {
        ...set,
        saved: false,
        words: set.words.map((word) => ({
          ...word,
          progress: null,
        })),
      };
    }

    const set = await this.prisma.vocabularySet.findUnique({
      where: { id },
      include: {
        savedBy: { where: { userId }, select: { id: true } },
        words: {
          orderBy: { sortOrder: 'asc' },
          include: {
            progress: { where: { userId } },
          },
        },
      },
    });
    if (!set) throw new NotFoundException('Không tìm thấy bộ từ vựng');

    return {
      ...set,
      saved: set.savedBy.length > 0,
      words: set.words.map((word) => ({
        ...word,
        progress: word.progress[0] ?? null,
      })),
    };
  }

  async saveSet(userId: string, setId: string) {
    await this.prisma.vocabularySet.findUniqueOrThrow({
      where: { id: setId },
    });
    await this.prisma.userVocabularySet.upsert({
      where: { userId_setId: { userId, setId } },
      create: { userId, setId },
      update: {},
    });
    return { saved: true };
  }

  async removeSet(userId: string, setId: string) {
    await this.prisma.userVocabularySet.deleteMany({
      where: { userId, setId },
    });
    return { saved: false };
  }

  async learnWord(userId: string, wordId: string) {
    await this.prisma.vocabularyWord.findUniqueOrThrow({
      where: { id: wordId },
    });
    const now = new Date();
    return this.prisma.userVocabularyProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: {
        userId,
        wordId,
        learnedAt: now,
        nextReviewAt: this.addDays(now, 1),
      },
      update: {},
    });
  }

  async reviewWord(userId: string, wordId: string, correct: boolean) {
    let progress = await this.prisma.userVocabularyProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    if (!progress) {
      progress = await this.learnWord(userId, wordId);
    }

    const reviewCount = progress.reviewCount + 1;
    const correctCount = progress.correctCount + (correct ? 1 : 0);
    const intervals = [1, 3, 7, 14, 30, 60];
    const intervalDays = correct
      ? intervals[Math.min(correctCount, intervals.length - 1)]
      : 1;
    const status =
      correctCount >= 4
        ? VocabularyProgressStatus.MASTERED
        : VocabularyProgressStatus.LEARNING;
    const now = new Date();

    return this.prisma.userVocabularyProgress.update({
      where: { id: progress.id },
      data: {
        reviewCount,
        correctCount,
        intervalDays,
        status,
        lastReviewedAt: now,
        nextReviewAt: this.addDays(now, intervalDays),
      },
    });
  }
}
