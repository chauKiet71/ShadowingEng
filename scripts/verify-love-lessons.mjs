import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessons = JSON.parse(
  readFileSync(join(root, 'client/src/data/lessons.json'), 'utf8'),
);
const ids = Array.from({ length: 10 }, (_, i) => `lesson-${93 + i}`);

async function main() {
  console.log('=== Data ===');
  let dataOk = 0;
  for (const id of ids) {
    const l = lessons.find((x) => x.id === id);
    const problems = [];
    if (!l) problems.push('missing');
    else {
      if (l.categoryId !== '10') problems.push('category');
      if (l.topic !== 'Tình yêu') problems.push('topic');
      if (!l.audioUrl?.endsWith(`${id}.mp3`)) problems.push('audioUrl');
      if (!l.sentences?.length) problems.push('sentences');
      for (const s of l.sentences) {
        if (!(s.time_end > s.time_start + 0.2)) problems.push(`short ${s.id}`);
        if (!s.english?.trim() || !s.vietnamese?.trim()) problems.push(`text ${s.id}`);
      }
      const p = join(root, 'client/public/audio', `${id}.mp3`);
      if (!existsSync(p) || statSync(p).size < 1000) problems.push('file');
    }
    if (!problems.length) dataOk += 1;
    console.log(`${problems.length ? '❌' : '✅'} ${id} ${l?.title ?? ''} ${problems.join(', ')}`);
  }

  console.log('\n=== HTTP ===');
  let httpOk = 0;
  for (const id of ids) {
    const res = await fetch(`http://127.0.0.1:3000/audio/${id}.mp3`, { method: 'HEAD' });
    if (res.ok) httpOk += 1;
    console.log(`${res.ok ? '✅' : '❌'} ${id} ${res.status}`);
  }

  const html = await (await fetch('http://127.0.0.1:3000/')).text();
  const assets = [...html.matchAll(/assets\/index-[^"']+\.js/g)].map((m) => m[0]);
  let bundleOk = false;
  for (const asset of assets) {
    const js = await (await fetch(`http://127.0.0.1:3000/${asset}`)).text();
    if (js.includes('Tình yêu') && js.includes('lesson-93') && js.includes('Cầu hôn')) {
      bundleOk = true;
      break;
    }
  }
  console.log(`\n${bundleOk ? '✅' : '❌'} Bundle has new topic`);
  console.log(JSON.stringify({ dataOk: `${dataOk}/10`, httpOk: `${httpOk}/10`, bundleOk }, null, 2));
  if (!(dataOk === 10 && httpOk === 10 && bundleOk)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
