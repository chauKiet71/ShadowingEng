import { createDateRangeFromPreset } from './adminDateRange';
import { api } from './api';
import {
  cachedFetch,
  invalidateCache,
  invalidateCacheByPrefix,
} from './prefetchCache';

/** Long TTL: switch between admin pages without refetching. Refresh buttons use force. */
const ADMIN_TTL = 60 * 60 * 1000;

export const AdminPrefetchKeys = {
  overview: 'admin:overview',
  userStats: 'admin:user-stats',
  users: (params: {
    page: number;
    limit: number;
    status?: string;
    isPremium?: boolean;
  }) =>
    `admin:users:${params.page}:${params.limit}:${params.status ?? ''}:${
      params.isPremium === undefined ? '' : String(params.isPremium)
    }`,
  lessonAccess: 'admin:lesson-access',
  packages: 'admin:packages',
  transactionStats: 'admin:tx-stats',
  transactions: (params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) =>
    `admin:tx:${params.page}:${params.limit}:${params.status ?? ''}:${params.search ?? ''}`,
  stats: (from: string, to: string) => `admin:stats:${from}:${to}`,
} as const;

export function fetchAdminOverview(force = false) {
  return cachedFetch(
    AdminPrefetchKeys.overview,
    () => api.getAdminOverview(),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminUserStats(force = false) {
  return cachedFetch(
    AdminPrefetchKeys.userStats,
    () => api.getUserStats(),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminUsers(
  params: {
    page: number;
    limit: number;
    status?: string;
    isPremium?: boolean;
  },
  force = false,
) {
  return cachedFetch(
    AdminPrefetchKeys.users(params),
    () =>
      api.getUsers({
        page: params.page,
        limit: params.limit,
        status: params.status,
        isPremium: params.isPremium,
      }),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminLessonAccess(force = false) {
  return cachedFetch(
    AdminPrefetchKeys.lessonAccess,
    () => api.getLessonAccessMap(),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminPackages(force = false) {
  return cachedFetch(
    AdminPrefetchKeys.packages,
    () => api.getPackages(),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminTransactionStats(force = false) {
  return cachedFetch(
    AdminPrefetchKeys.transactionStats,
    () => api.getAdminTransactionStats(),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminTransactions(
  params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  },
  force = false,
) {
  return cachedFetch(
    AdminPrefetchKeys.transactions(params),
    () =>
      api.getAdminTransactions({
        page: params.page,
        limit: params.limit,
        status: params.status,
        search: params.search,
      }),
    { ttlMs: ADMIN_TTL, force },
  );
}

export function fetchAdminStats(
  params: { from: string; to: string },
  force = false,
) {
  return cachedFetch(
    AdminPrefetchKeys.stats(params.from, params.to),
    () => api.getAdminStats({ from: params.from, to: params.to }),
    { ttlMs: ADMIN_TTL, force },
  );
}

/** Prefetch default payloads for every admin sidebar page. Safe to call repeatedly. */
export function prefetchAdminPages() {
  const defaultStats = createDateRangeFromPreset('last_30');
  return Promise.allSettled([
    fetchAdminOverview(),
    fetchAdminUserStats(),
    fetchAdminUsers({ page: 1, limit: 10 }),
    fetchAdminLessonAccess(),
    fetchAdminPackages(),
    fetchAdminTransactionStats(),
    fetchAdminTransactions({ page: 1, limit: 10 }),
    fetchAdminStats({ from: defaultStats.from, to: defaultStats.to }),
  ]);
}

export function clearAdminPrefetch() {
  invalidateCache([
    AdminPrefetchKeys.overview,
    AdminPrefetchKeys.userStats,
    AdminPrefetchKeys.lessonAccess,
    AdminPrefetchKeys.packages,
    AdminPrefetchKeys.transactionStats,
  ]);
  invalidateCacheByPrefix('admin:users:');
  invalidateCacheByPrefix('admin:tx:');
  invalidateCacheByPrefix('admin:stats:');
}

export function invalidateAdminUsersCache() {
  invalidateCache(AdminPrefetchKeys.userStats);
  invalidateCacheByPrefix('admin:users:');
}

export function invalidateAdminPackagesCache() {
  invalidateCache(AdminPrefetchKeys.packages);
}

export function invalidateAdminOverviewCache() {
  invalidateCache(AdminPrefetchKeys.overview);
}
