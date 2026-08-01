"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgPool = createPgPool;
const pg_1 = require("pg");
function createPgPool(connectionString) {
    if (!connectionString) {
        throw new Error('DATABASE_URL chưa được cấu hình trong .env');
    }
    const useSsl = connectionString.includes('neon.tech') ||
        connectionString.includes('sslmode=require') ||
        connectionString.includes('amazonaws.com');
    return new pg_1.Pool({
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        max: 10,
        connectionTimeoutMillis: 15000,
    });
}
//# sourceMappingURL=pg-pool.js.map