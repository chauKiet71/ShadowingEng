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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '')
    .trim();
}

function tokenizeSentence(text) {
  return text
    .replace(/["“”]/g, '')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

async function main() {
  const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`Lesson not found: ${lessonId}`);

  const wavPath = join(audioDir, `${lessonId}.wav`);
  const mp3Path = join(audioDir, `${lessonId}.mp3`);
  let audioPath = wavPath;

  if (existsSync(wavPath)) {
    const head = readFileSync(wavPath).subarray(0, 3).toString('ascii');
    if (head === 'ID3') {
      copyFileSync(wavPath, mp3Path);
      audioPath = mp3Path;
      lesson.audioUrl = `/audio/${lessonId}.mp3`;
    }
  } else if (existsSync(mp3Path)) {
    audioPath = mp3Path;
    lesson.audioUrl = `/audio/${lessonId}.mp3`;
  } else {
    throw new Error(`Audio not found for ${lessonId}`);
  }

  const prompt = lesson.sentences.map((s) => s.english).join(' ');

  const transcription = await openai.audio.transcriptions.create({
    file: await OpenAI.toFile(readFileSync(audioPath), `${lessonId}.mp3`),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
    prompt,
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
    const tokens = tokenizeSentence(sentence.english);
    if (tokens.length === 0) continue;

    let found = false;
    for (let i = cursor; i <= flat.length - tokens.length; i += 1) {
      let ok = true;
      for (let j = 0; j < tokens.length; j += 1) {
        if (flat[i + j]?.token !== tokens[j]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      sentence.time_start = Number(flat[i].start.toFixed(2));
      sentence.time_end = Number(flat[i + tokens.length - 1].end.toFixed(2));
      cursor = i + tokens.length;
      found = true;
      console.log(
        `${sentence.id} [${sentence.time_start}-${sentence.time_end}] :: ${sentence.english}`,
      );
      break;
    }

    if (!found) {
      console.warn('Could not align:', sentence.english);
    }
  }

  // Fill gaps: ensure monotonic non-overlapping ranges
  for (let i = 0; i < lesson.sentences.length; i += 1) {
    const current = lesson.sentences[i];
    const prev = lesson.sentences[i - 1];
    if (prev && current.time_start < prev.time_end) {
      current.time_start = Number(prev.time_end.toFixed(2));
    }
    if (current.time_end <= current.time_start) {
      current.time_end = Number((current.time_start + 1.5).toFixed(2));
    }
  }

  lesson.duration = Math.ceil(transcription.duration ?? lesson.sentences.at(-1)?.time_end ?? 0);
  writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2), 'utf8');
  console.log(`Updated ${lessonId}, duration=${lesson.duration}s, words=${words.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
