import type { PackageRow } from '../lib/api';

export type DurationUnit = 'DAY' | 'MONTH';

export interface Plan {
  id: string;
  label: string;
  durationUnit: DurationUnit;
  months: number;
  days: number;
  unitPrice: number;
  total: number;
  original?: number;
  badge?: string;
}

export function mapPackageToPlan(pkg: PackageRow): Plan {
  return {
    id: pkg.id,
    label: pkg.name,
    durationUnit: pkg.durationUnit,
    months: pkg.months,
    days: pkg.days,
    unitPrice: pkg.monthlyPrice,
    total: pkg.price,
    original: pkg.originalPrice ?? undefined,
    badge: pkg.badge ?? undefined,
  };
}

export function formatPrice(price: number) {
  return price.toLocaleString('vi-VN') + 'đ';
}

export function getUnitPriceLabel(unit: DurationUnit) {
  return unit === 'DAY' ? '/ ngày' : '/ tháng';
}

export function getPlanDurationLabel(plan: Pick<Plan, 'durationUnit' | 'months' | 'days'>) {
  if (plan.durationUnit === 'DAY') return `${plan.days} ngày`;
  return `${plan.months} tháng`;
}

export function getPlanEndDate(
  start: Date,
  plan: Pick<Plan, 'durationUnit' | 'months' | 'days'>,
) {
  const end = new Date(start);
  if (plan.durationUnit === 'DAY') {
    end.setDate(end.getDate() + plan.days);
  } else {
    end.setMonth(end.getMonth() + plan.months);
  }
  return end;
}

export function getTransferSuffix(plan: Pick<Plan, 'durationUnit' | 'months' | 'days'>) {
  if (plan.durationUnit === 'DAY') return `${plan.days}D`;
  return `${plan.months}T`;
}

export function calcUnitPrice(
  price: number,
  durationUnit: DurationUnit,
  days: number,
  months: number,
) {
  if (durationUnit === 'DAY' && days > 0) return Math.round(price / days);
  if (months > 0) return Math.round(price / months);
  return price;
}

export function formatDurationText(
  durationUnit: DurationUnit,
  value: number,
) {
  return durationUnit === 'DAY' ? `${value} ngày` : `${value} tháng`;
}
