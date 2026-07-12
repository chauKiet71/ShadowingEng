/**
 * ElevenLabs — clone giọng & tạo audio bài học
 *
 * Cấu hình trong backend/.env:
 *   ELEVENLABS_API_KEY=...
 *   ELEVENLABS_VOICE_ID=...   (lấy từ list-voices hoặc clone-voice)
 *
 * Lệnh:
 *   node scripts/elevenlabs-audio.mjs list-voices
 *   node scripts/elevenlabs-audio.mjs clone-voice --name "Giọng của tôi" --file ./sample.mp3
 *   node scripts/elevenlabs-audio.mjs generate lesson-01
 *   node scripts/elevenlabs-audio.mjs generate --travel-1-10
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });

const API = 'https://api.elevenlabs.io/v1';
const TRAVEL_IDS = [
  'lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05',
  'lesson-06', 'lesson-07', 'lesson-08', 'lesson-09', 'lesson-10',
];

function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error('Thiếu ELEVENLABS_API_KEY trong backend/.env');
  }
  return key;
}

function getVoiceId() {
  const id = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!id) {
    throw new Error(
      'Thiếu ELEVENLABS_VOICE_ID trong backend/.env — chạy list-voices hoặc clone-voice trước',
    );
  }
  return id;
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() ?? 'help';
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

async function listVoices() {
  const res = await fetch(`${API}/voices`, {
    headers: { 'xi-api-key': getApiKey() },
  });

  if (!res.ok) {
    throw new Error(`list-voices failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  console.log('\nGiọng có sẵn trong tài khoản ElevenLabs:\n');

  for (const voice of data.voices ?? []) {
    console.log(`- ${voice.name}`);
    console.log(`  voice_id: ${voice.voice_id}`);
    console.log(`  category: ${voice.category ?? 'n/a'}`);
    console.log('');
  }

  console.log('Copy voice_id vào backend/.env → ELEVENLABS_VOICE_ID=...');
}

async function cloneVoice(name, filePath) {
  if (!name) throw new Error('Thiếu --name "Tên giọng"');
  if (!filePath || !existsSync(filePath)) {
    throw new Error(`Không tìm thấy file audio: ${filePath ?? '(trống)'}`);
  }

  const form = new FormData();
  form.append('name', name);
  form.append(
    'files',
    new Blob([readFileSync(filePath)]),
    basename(filePath),
  );
  form.append('description', 'Shadowing ENGLISH lesson voice');

  const res = await fetch(`${API}/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': getApiKey() },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`clone-voice failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  console.log('\n✅ Clone giọng thành công!');
  console.log(`voice_id: ${data.voice_id}`);
  console.log('\nThêm vào backend/.env:');
  console.log(`ELEVENLABS_VOICE_ID=${data.voice_id}`);
}

async function synthesizeLesson(lesson, voiceId, outputDir) {
  const text = lesson.sentences.map((s) => s.english).join(' ');
  const outFile = join(outputDir, `${lesson.id}.mp3`);

  const res = await fetch(
    `${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402) {
      throw new Error(
        `${lesson.id} TTS failed (402 payment_required): Gói Free không dùng giọng thư viện qua API.\n` +
          '→ Clone giọng riêng trên ElevenLabs (Instant Voice Clone) rồi dùng voice_id đó,\n' +
          '→ hoặc nâng cấp Starter ($5/tháng).\n' +
          `Chi tiết: ${body}`,
      );
    }
    throw new Error(`${lesson.id} TTS failed (${res.status}): ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(outFile, buffer);
  console.log(`Generated ${outFile} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return outFile;
}

async function generateLessons(lessonIds) {
  const voiceId = getVoiceId();
  const lessonsPath = join(root, 'client/src/data/lessons.json');
  const outputDir = join(root, 'client/public/audio');
  mkdirSync(outputDir, { recursive: true });

  const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  const targets = lessons.filter((l) => lessonIds.includes(l.id));

  if (targets.length === 0) {
    throw new Error(`Không tìm thấy bài: ${lessonIds.join(', ')}`);
  }

  console.log(`\nTạo audio ElevenLabs cho ${targets.length} bài (voice: ${voiceId})...\n`);

  for (const lesson of targets) {
    await synthesizeLesson(lesson, voiceId, outputDir);
    lesson.audioUrl = `/audio/${lesson.id}.mp3`;
  }

  writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2), 'utf8');

  console.log('\n✅ Xong! Các bước tiếp theo:');
  console.log('  1. node scripts/align-lesson-timestamps.mjs lesson-01  (lặp từng bài)');
  console.log('  2. npm run sync:audio');
  console.log('  3. npm run build:client');
}

function printHelp() {
  console.log(`
ElevenLabs audio tool

Cấu hình (.env):
  ELEVENLABS_API_KEY=sk_...
  ELEVENLABS_VOICE_ID=...
  ELEVENLABS_MODEL_ID=eleven_turbo_v2_5   (tùy chọn)

Lệnh:
  list-voices
  clone-voice --name "Tên giọng" --file ./duong-dan/sample.mp3
  generate lesson-01
  generate --travel-1-10

Lấy API key: https://elevenlabs.io/app/settings/api-keys
`);
}

async function main() {
  const { command, flags, positional } = parseArgs(process.argv.slice(2));

  switch (command) {
    case 'list-voices':
      await listVoices();
      break;

    case 'clone-voice':
      await cloneVoice(flags.name, flags.file);
      break;

    case 'generate': {
      const ids = flags['travel-1-10']
        ? TRAVEL_IDS
        : positional.length > 0
          ? positional
          : null;
      if (!ids) {
        throw new Error('generate cần lesson-id hoặc --travel-1-10');
      }
      await generateLessons(ids);
      break;
    }

    default:
      printHelp();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
