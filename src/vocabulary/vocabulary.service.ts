import { Injectable, NotFoundException } from '@nestjs/common';
import { VocabularyProgressStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TECH_VOCABULARY_SETS,
  type VocabularySeedSet,
} from './vocabulary-tech-sets';
import { TRAVEL_VOCABULARY_SET } from './vocabulary-travel-set';
import { DAILY_VOCABULARY_SET } from './vocabulary-daily-set';
import { MOVIE_VOCABULARY_SET } from './vocabulary-movie-set';
import { OFFICE_VOCABULARY_SET } from './vocabulary-office-set';

const SETS: VocabularySeedSet[] = [
  TRAVEL_VOCABULARY_SET,
  DAILY_VOCABULARY_SET,
  OFFICE_VOCABULARY_SET,
  MOVIE_VOCABULARY_SET,
  ...TECH_VOCABULARY_SETS,
];

@Injectable()
export class VocabularyService {
  private catalogSync: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
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

  async getOverview(userId: string) {
    await this.ensureCatalog();
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

  async getSets(userId: string) {
    const overview = await this.getOverview(userId);
    return overview.sets;
  }

  async getSet(userId: string, id: string) {
    await this.ensureCatalog();
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
