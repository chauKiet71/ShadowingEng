import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessons = JSON.parse(
  readFileSync(join(root, 'client/src/data/lessons.json'), 'utf8'),
);
const ids = Array.from({ length: 10 }, (_, i) => `lesson-${83 + i}`);

function checkLessonData(lesson) {
  const problems = [];
  if (!lesson) return ['MISSING_LESSON'];
  if (lesson.categoryId !== '9') problems.push('categoryId');
  if (lesson.topic !== 'Đời sống sinh viên') problems.push('topic');
  if (!lesson.audioUrl?.endsWith(`${lesson.id}.mp3`)) problems.push('audioUrl');
  if (!lesson.sentences?.length) problems.push('no sentences');

  let prevEnd = -1;
  for (const s of lesson.sentences) {
    if (!s.english?.trim() || !s.vietnamese?.trim()) {
      problems.push(`empty text ${s.id}`);
    }
    if (!(s.time_end > s.time_start)) problems.push(`bad time ${s.id}`);
    if (s.time_start < prevEnd - 0.05) problems.push(`overlap ${s.id}`);
    prevEnd = s.time_end;
  }

  const last = lesson.sentences.at(-1).time_end;
  if (Math.abs(lesson.duration - Math.ceil(last)) > 2) {
    problems.push('duration vs lastEnd');
  }
  return problems;
}

async function main() {
  console.log('=== 1) Data integrity ===');
  let dataOk = 0;
  for (const id of ids) {
    const lesson = lessons.find((l) => l.id === id);
    const problems = checkLessonData(lesson);
    const clientAudio = join(root, 'client/public/audio', `${id}.mp3`);
    const publicAudio = join(root, 'public/audio', `${id}.mp3`);
    if (!existsSync(clientAudio)) problems.push('missing client audio');
    if (!existsSync(publicAudio)) problems.push('missing public audio');
    if (problems.length === 0) dataOk += 1;
    console.log(
      `${problems.length === 0 ? '✅' : '❌'} ${id} ${lesson?.title ?? ''} ${
        problems.length ? ':: ' + problems.join(', ') : `(${lesson.sentences.length} câu, ${lesson.duration}s)`
      }`,
    );
  }

  console.log('\n=== 2) HTTP audio ===');
  let httpOk = 0;
  for (const id of ids) {
    const res = await fetch(`http://127.0.0.1:3000/audio/${id}.mp3`, {
      method: 'HEAD',
    });
    if (res.ok) httpOk += 1;
    console.log(
      `${res.ok ? '✅' : '❌'} ${id} HTTP ${res.status} ${res.headers.get('content-type')} ${res.headers.get('content-length')}B`,
    );
  }

  console.log('\n=== 3) Bundle + explore category ===');
  const html = await (await fetch('http://127.0.0.1:3000/')).text();
  const assets = [...html.matchAll(/assets\/index-[^"']+\.js/g)].map((m) => m[0]);
  let bundleOk = false;
  for (const asset of assets) {
    const js = await (await fetch(`http://127.0.0.1:3000/${asset}`)).text();
    if (
      js.includes('Đời sống sinh viên') &&
      js.includes('lesson-83') &&
      js.includes('Ngày đầu nhập học') &&
      js.includes('lesson-92')
    ) {
      bundleOk = true;
      break;
    }
  }
  console.log(`${bundleOk ? '✅' : '❌'} Production bundle contains new topic/lessons`);

  console.log('\n=== 4) Login + access map ===');
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@shadowing.com',
      password: 'admin123',
    }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token = loginBody.accessToken || loginBody.access_token || loginBody.token;
  console.log(
    `${loginRes.ok && token ? '✅' : '❌'} Login admin (${loginRes.status})`,
  );

  if (token) {
    const accessRes = await fetch('http://127.0.0.1:3000/api/lessons/access', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const accessMap = await accessRes.json().catch(() => ({}));
    let locked = 0;
    for (const id of ids) {
      if (accessMap[id] === true) locked += 1;
    }
    console.log(
      `${accessRes.ok ? '✅' : '❌'} Access map loaded; locked among new lessons: ${locked}/10 (missing=unlocked)`,
    );
  }

  console.log('\n=== SUMMARY ===');
  console.log(
    JSON.stringify(
      {
        dataOk: `${dataOk}/10`,
        httpOk: `${httpOk}/10`,
        bundleOk,
        allPass: dataOk === 10 && httpOk === 10 && bundleOk,
      },
      null,
      2,
    ),
  );

  if (!(dataOk === 10 && httpOk === 10 && bundleOk)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
