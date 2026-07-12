import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });

const lessonId = process.argv[2] ?? 'lesson-81';
const lessonsPath = join(root, 'client/src/data/lessons.json');
const audioDir = join(root, 'client/public/audio');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function normalizeToken(text) {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '')
    .trim();

  const numbers = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
  };

  return numbers[raw] ?? raw;
}

function tokenizeSentence(text) {
  return text
    .replace(/["""'']/g, '')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

/** Tìm token kế tiếp, cho phép ghép từ (check + in) và bỏ qua từ thừa */
function findTokenSpan(flat, fromIndex, token) {
  for (let start = fromIndex; start < flat.length; start += 1) {
    let merged = '';

    for (let end = start; end < flat.length; end += 1) {
      merged += flat[end].token;

      if (merged === token) {
        return { start, end, nextIndex: end + 1 };
      }

      if (!token.startsWith(merged)) {
        break;
      }
    }
  }

  return null;
}

function matchTokensFrom(flat, cursor, tokens) {
  let index = cursor;
  let firstIndex = -1;
  let lastIndex = -1;

  for (const token of tokens) {
    const span = findTokenSpan(flat, index, token);
    if (!span) return null;

    if (firstIndex === -1) firstIndex = span.start;
    lastIndex = span.end;
    index = span.nextIndex;
  }

  return {
    start: flat[firstIndex].start,
    end: flat[lastIndex].end,
    nextIndex: index,
  };
}

function interpolateMissing(sentences, totalDuration) {
  const aligned = sentences.filter(
    (s) => typeof s.time_start === 'number' && typeof s.time_end === 'number' && s.time_end > s.time_start,
  );

  for (let i = 0; i < sentences.length; i += 1) {
    const s = sentences[i];
    const hasValid =
      typeof s.time_start === 'number' &&
      typeof s.time_end === 'number' &&
      s.time_end > s.time_start + 0.2;

    if (hasValid) continue;

    const prev = sentences[i - 1];
    let next = null;
    for (let j = i + 1; j < sentences.length; j += 1) {
      if (sentences[j].time_end > sentences[j].time_start + 0.2) {
        next = sentences[j];
        break;
      }
    }

    const start = prev?.time_end ?? 0;
    const end = next?.time_start ?? totalDuration;
    const gap = Math.max(0.8, end - start);
    const missingCount = sentences.slice(i, next ? sentences.indexOf(next) : sentences.length).length;
    const sliceDuration = gap / missingCount;

    s.time_start = Number(start.toFixed(2));
    s.time_end = Number(Math.min(end, start + sliceDuration).toFixed(2));
    console.warn(`Interpolated ${s.id} [${s.time_start}-${s.time_end}] :: ${s.english}`);
  }
}

async function main() {
  const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`Lesson not found: ${lessonId}`);

  const wavPath = join(audioDir, `${lessonId}.wav`);
  const mp3Path = join(audioDir, `${lessonId}.mp3`);
  const legacyWavPath =
    lessonId === 'lesson-10' ? join(audioDir, 'lesson-010.wav') : null;
  let audioPath = wavPath;

  if (existsSync(wavPath)) {
    const head = readFileSync(wavPath).subarray(0, 3).toString('ascii');
    if (head === 'ID3') {
      copyFileSync(wavPath, mp3Path);
      audioPath = mp3Path;
      lesson.audioUrl = `/audio/${lessonId}.mp3`;
    } else {
      lesson.audioUrl = '';
    }
  } else if (existsSync(mp3Path)) {
    audioPath = mp3Path;
    lesson.audioUrl = `/audio/${lessonId}.mp3`;
  } else if (legacyWavPath && existsSync(legacyWavPath)) {
    audioPath = legacyWavPath;
  } else {
    throw new Error(`Audio not found for ${lessonId}`);
  }

  const transcription = await openai.audio.transcriptions.create({
    file: await OpenAI.toFile(readFileSync(audioPath), `${lessonId}.mp3`),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
    language: 'en',
  });

  const words = transcription.words ?? [];
  if (words.length === 0) {
    throw new Error('Whisper returned no word timestamps');
  }

  const flat = words.map((w) => ({
    token: normalizeToken(w.word),
    start: w.start,
    end: w.end,
  }));

  let cursor = 0;

  for (const sentence of lesson.sentences) {
    delete sentence.time_start;
    delete sentence.time_end;

    const tokens = tokenizeSentence(sentence.english);
    if (tokens.length === 0) continue;

    const match = matchTokensFrom(flat, cursor, tokens);
    if (!match) {
      console.warn('Could not align:', sentence.english);
      continue;
    }

    sentence.time_start = Number(match.start.toFixed(2));
    sentence.time_end = Number(match.end.toFixed(2));
    cursor = match.nextIndex;
    console.log(
      `${sentence.id} [${sentence.time_start}-${sentence.time_end}] :: ${sentence.english}`,
    );
  }

  const totalDuration = transcription.duration ?? flat.at(-1)?.end ?? 0;
  interpolateMissing(lesson.sentences, totalDuration);

  for (let i = 0; i < lesson.sentences.length; i += 1) {
    const current = lesson.sentences[i];
    const prev = lesson.sentences[i - 1];
    if (prev && current.time_start < prev.time_end) {
      current.time_start = Number((prev.time_end + 0.05).toFixed(2));
    }
    if (current.time_end <= current.time_start) {
      current.time_end = Number((current.time_start + 1.2).toFixed(2));
    }
  }

  lesson.duration = Math.ceil(
    totalDuration || lesson.sentences.at(-1)?.time_end || 0,
  );
  writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2), 'utf8');
  console.log(`Updated ${lessonId}, duration=${lesson.duration}s, words=${words.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
