import { Pool } from 'pg';

export function createPgPool(connectionString?: string): Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL chưa được cấu hình trong .env');
  }

  const useSsl =
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('amazonaws.com');

  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    connectionTimeoutMillis: 15000,
  });
}
