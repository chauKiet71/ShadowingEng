import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const audioDir = join(root, 'client/public/audio');

function getWavDurationSeconds(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;

  let offset = 12;
  let sampleRate = 0;
  let byteRate = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ') {
      byteRate = buffer.readUInt32LE(chunkStart + 8);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (byteRate > 0 && dataSize > 0) return dataSize / byteRate;
  return null;
}

function getMp3DurationEstimate(buffer) {
  // Xấp xỉ từ bitrate trung bình 128kbps nếu không parse được frame
  const id3Size =
    buffer.toString('ascii', 0, 3) === 'ID3'
      ? ((buffer[6] & 0x7f) << 21) |
        ((buffer[7] & 0x7f) << 14) |
        ((buffer[8] & 0x7f) << 7) |
        (buffer[9] & 0x7f) +
        10
      : 0;
  const audioBytes = Math.max(0, buffer.length - id3Size);
  return audioBytes / (128 * 1024 / 8);
}

function getAudioDuration(filePath) {
  const buffer = readFileSync(filePath);
  const head = buffer.subarray(0, 4).toString('ascii');

  if (head === 'RIFF') {
    return { seconds: getWavDurationSeconds(buffer), format: 'wav' };
  }

  if (head.startsWith('ID3') || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
    return { seconds: getMp3DurationEstimate(buffer), format: 'mp3', estimated: true };
  }

  return { seconds: null, format: 'unknown' };
}

function resolveAudioPath(lessonId, audioUrl) {
  const candidates = [];
  if (audioUrl?.trim()) {
    candidates.push(join(root, 'public', audioUrl.replace(/^\//, '')));
    candidates.push(join(audioDir, audioUrl.split('/').pop()));
  }
  candidates.push(join(audioDir, `${lessonId}.wav`));
  candidates.push(join(audioDir, `${lessonId}.mp3`));
  if (lessonId === 'lesson-10') {
    candidates.push(join(audioDir, 'lesson-010.wav'));
  }

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
const focusIds = new Set(
  Array.from({ length: 10 }, (_, i) => `lesson-${String(i + 1).padStart(2, '0')}`),
);

const rows = [];

for (const lesson of lessons) {
  if (!focusIds.has(lesson.id)) continue;

  const lastEnd = lesson.sentences.at(-1)?.time_end ?? 0;
  const jsonDuration = lesson.duration;
  const audioPath = resolveAudioPath(lesson.id, lesson.audioUrl);
  const sentenceCount = lesson.sentences.length;

  if (!audioPath) {
    rows.push({
      id: lesson.id,
      title: lesson.title,
      status: 'NO_AUDIO',
      jsonDuration,
      lastEnd,
      audioSeconds: null,
      diff: null,
    });
    continue;
  }

  const { seconds: audioSeconds, format, estimated } = getAudioDuration(audioPath);
  const diff = audioSeconds != null ? Math.round((jsonDuration - audioSeconds) * 10) / 10 : null;
  const lastDiff =
    audioSeconds != null ? Math.round((lastEnd - audioSeconds) * 10) / 10 : null;

  let status = 'OK';
  if (audioSeconds == null) status = 'UNKNOWN_FORMAT';
  else if (Math.abs(jsonDuration - audioSeconds) > 3 || Math.abs(lastEnd - audioSeconds) > 3) {
    status = 'MISMATCH';
  }

  rows.push({
    id: lesson.id,
    title: lesson.title,
    status,
    file: audioPath.split(/[/\\]/).pop(),
    format,
    estimated: estimated ?? false,
    jsonDuration,
    lastEnd,
    audioSeconds: audioSeconds != null ? Math.round(audioSeconds * 10) / 10 : null,
    diffDuration: diff,
    diffLastEnd: lastDiff,
    sentences: sentenceCount,
  });
}

console.log('\n=== KIỂM TRA AUDIO vs JSON (lesson-01 → lesson-10) ===\n');
for (const row of rows) {
  console.log(`${row.id} | ${row.title}`);
  if (row.status === 'NO_AUDIO') {
    console.log('  ❌ Không tìm thấy file audio');
    console.log(`  JSON duration: ${row.jsonDuration}s | lastEnd: ${row.lastEnd}s\n`);
    continue;
  }
  const icon = row.status === 'OK' ? '✅' : '⚠️';
  console.log(`  ${icon} ${row.status} | file: ${row.file} (${row.format}${row.estimated ? ', ước lượng' : ''})`);
  console.log(
    `  Audio thật: ${row.audioSeconds}s | JSON duration: ${row.jsonDuration}s | Câu cuối end: ${row.lastEnd}s`,
  );
  console.log(
    `  Lệch duration: ${row.diffDuration}s | Lệch lastEnd: ${row.diffLastEnd}s | ${row.sentences} câu\n`,
  );
}

const mismatched = rows.filter((r) => r.status !== 'OK');
console.log(`Tổng: ${rows.length} bài | Khớp: ${rows.length - mismatched.length} | Cần xử lý: ${mismatched.length}`);
