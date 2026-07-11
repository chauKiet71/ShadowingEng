import { execSync } from 'child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseSync');

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConnectionError(output: string): boolean {
  return (
    output.includes('P1001') ||
    output.includes("Can't reach database server") ||
    output.includes('ECONNREFUSED') ||
    output.includes('ETIMEDOUT') ||
    output.includes('ENOTFOUND')
  );
}

function runDbPush(): void {
  execSync('npx prisma db push', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: process.env,
  });
}

export async function syncDatabaseSchema(): Promise<void> {
  if (process.env.AUTO_SYNC_DB === 'false') {
    logger.log('AUTO_SYNC_DB=false — bỏ qua đồng bộ schema');
    return;
  }

  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL chưa cấu hình — bỏ qua đồng bộ schema');
    return;
  }

  logger.log('Đang đồng bộ schema database (tạo bảng/cột nếu chưa có)...');

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      runDbPush();
      logger.log('Đồng bộ schema database thành công');
      return;
    } catch (error) {
      lastError = error;
      const output = [
        error instanceof Error && 'stdout' in error
          ? String((error as NodeJS.ErrnoException & { stdout?: Buffer }).stdout ?? '')
          : '',
        error instanceof Error && 'stderr' in error
          ? String((error as NodeJS.ErrnoException & { stderr?: Buffer }).stderr ?? '')
          : '',
        error instanceof Error ? error.message : String(error),
      ].join('\n');

      const canRetry = isConnectionError(output) && attempt < MAX_ATTEMPTS;
      if (!canRetry) break;

      logger.warn(
        `Không kết nối được database (lần ${attempt}/${MAX_ATTEMPTS}). ` +
          `Neon có thể đang khởi động — thử lại sau ${RETRY_DELAY_MS / 1000}s...`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : 'Không thể đồng bộ schema database';

  logger.error(`Đồng bộ schema thất bại: ${message}`);
  logger.error(
    'Gợi ý: kiểm tra internet/VPN, mở Neon Console để đánh thức DB, ' +
      'hoặc đặt AUTO_SYNC_DB=false trong .env nếu chỉ dev frontend.',
  );
  throw lastError;
}
