import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'client/public/audio');
const targetDir = join(root, 'public/audio');

if (!existsSync(sourceDir)) {
  console.error(`Missing source folder: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

const files = readdirSync(sourceDir).filter((name) => /\.(wav|mp3)$/i.test(name));
for (const file of files) {
  cpSync(join(sourceDir, file), join(targetDir, file));
}

console.log(`Synced ${files.length} audio files -> ${targetDir}`);
