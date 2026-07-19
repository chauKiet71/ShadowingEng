import lessonsData from './lessons.json';

export interface LessonSentence {
  id: string;
  english: string;
  phonetic: string;
  vietnamese: string;
  time_start: number;
  time_end: number;
}

export interface Lesson {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  audioUrl: string;
  duration: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  topic: string;
  sentences: LessonSentence[];
}

export const lessons = lessonsData as Lesson[];

function resolveAudioUrl(lesson: Lesson): string {
  if (lesson.audioUrl?.trim()) return lesson.audioUrl;
  return `/audio/${lesson.id}.wav`;
}

export function getLessonById(id: string): Lesson | undefined {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return undefined;
  return {
    ...lesson,
    audioUrl: resolveAudioUrl(lesson),
  };
}

export function getFeaturedLessons(): Lesson[] {
  return lessons
    .filter((lesson) => lesson.level === 'BEGINNER')
    .slice(0, 10)
    .map((lesson) => ({
      ...lesson,
      audioUrl: resolveAudioUrl(lesson),
    }));
}

export function getLessonsByCategory(categoryId: string): Lesson[] {
  return lessons
    .filter((lesson) => lesson.categoryId === categoryId)
    .map((lesson) => ({
      ...lesson,
      audioUrl: resolveAudioUrl(lesson),
    }));
}

export function getLessonsByIds(ids: string[]): Lesson[] {
  return ids
    .map((id) => getLessonById(id))
    .filter((lesson): lesson is Lesson => lesson !== undefined);
}

export function getRandomLessonId(): string {
  const index = Math.floor(Math.random() * lessons.length);
  return lessons[index]?.id ?? 'lesson-01';
}

export function formatLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    BEGINNER: 'Cơ bản',
    INTERMEDIATE: 'Trung cấp',
    ADVANCED: 'Nâng cao',
  };
  return labels[level] ?? level;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function findActiveSentenceIndex(
  sentences: LessonSentence[],
  currentTime: number,
): number {
  if (sentences.length === 0) return 0;

  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    if (currentTime >= sentences[i].time_start) {
      return i;
    }
  }

  return 0;
}
