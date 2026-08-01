import { createHash } from 'node:crypto';
import { access, chmod, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const toolsDir = join(repositoryRoot, 'tools');
const platform = process.env.npm_config_platform || process.platform;
const arch = process.env.npm_config_arch || process.arch;
const defaultReleaseBaseUrl =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download';

const releaseAssets = {
  'win32:x64': { asset: 'yt-dlp.exe', target: 'yt-dlp.exe' },
  'win32:arm64': { asset: 'yt-dlp_arm64.exe', target: 'yt-dlp.exe' },
  'linux:x64': { asset: 'yt-dlp_linux', target: 'yt-dlp' },
  'linux:arm64': { asset: 'yt-dlp_linux_aarch64', target: 'yt-dlp' },
  'darwin:x64': { asset: 'yt-dlp_macos', target: 'yt-dlp' },
  'darwin:arm64': { asset: 'yt-dlp_macos', target: 'yt-dlp' },
};

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchOrThrow(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'application/octet-stream, text/plain;q=0.9, */*;q=0.8',
      'user-agent': 'ShadowingEng-build',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }
  return response;
}

function checksumForAsset(checksums, assetName) {
  for (const line of checksums.split(/\r?\n/)) {
    const match = line.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (match?.[2] === assetName) return match[1].toLowerCase();
  }
  throw new Error(`No SHA-256 checksum found for ${assetName}`);
}

async function main() {
  if (process.env.YT_DLP_SKIP_INSTALL === 'true') {
    console.log('[yt-dlp] Download skipped by YT_DLP_SKIP_INSTALL');
    return;
  }

  const configuredPath = process.env.YT_DLP_PATH?.trim();
  if (configuredPath && (await exists(configuredPath))) {
    console.log(`[yt-dlp] Using YT_DLP_PATH: ${configuredPath}`);
    return;
  }

  const release = releaseAssets[`${platform}:${arch}`];
  if (!release) {
    throw new Error(
      `Unsupported yt-dlp platform: ${platform}/${arch}. ` +
        'Set YT_DLP_PATH or YT_DLP_SKIP_INSTALL=true.',
    );
  }

  const targetPath = join(toolsDir, release.target);
  const forceInstall = process.env.YT_DLP_FORCE_INSTALL === 'true';
  if (!forceInstall && (await exists(targetPath))) {
    await chmod(targetPath, 0o755);
    console.log(`[yt-dlp] Local binary already exists: ${targetPath}`);
    return;
  }

  const releaseBaseUrl = (
    process.env.YT_DLP_RELEASE_BASE_URL || defaultReleaseBaseUrl
  ).replace(/\/$/, '');

  const checksumsResponse = await fetchOrThrow(
    `${releaseBaseUrl}/SHA2-256SUMS`,
  );
  const checksums = await checksumsResponse.text();
  const expectedChecksum = checksumForAsset(checksums, release.asset);
  const binaryResponse = await fetchOrThrow(
    `${releaseBaseUrl}/${encodeURIComponent(release.asset)}`,
  );
  const binary = Buffer.from(await binaryResponse.arrayBuffer());
  const actualChecksum = createHash('sha256').update(binary).digest('hex');

  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `SHA-256 mismatch for ${release.asset}: expected ` +
        `${expectedChecksum}, received ${actualChecksum}`,
    );
  }

  await mkdir(toolsDir, { recursive: true });
  const temporaryPath = `${targetPath}.tmp`;
  await writeFile(temporaryPath, binary);
  await chmod(temporaryPath, 0o755);
  await rm(targetPath, { force: true });
  await rename(temporaryPath, targetPath);
  console.log(
    `[yt-dlp] Installed ${release.asset} for ` + `${platform}/${arch}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.YT_DLP_INSTALL_REQUIRED === 'true') {
    console.error(`[yt-dlp] Required installation failed: ${message}`);
    process.exitCode = 1;
    return;
  }

  console.warn(
    `[yt-dlp] Optional installation skipped: ${message}. ` +
      'The app will continue to install. Set YT_DLP_INSTALL_REQUIRED=true ' +
      'to make this failure fatal.',
  );
});
