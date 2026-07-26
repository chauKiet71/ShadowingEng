export type DatePresetId =
  | 'today'
  | 'yesterday'
  | 'maximum'
  | 'today_yesterday'
  | 'last_7'
  | 'last_14'
  | 'last_28'
  | 'last_30'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export type DateRangeValue = {
  preset: DatePresetId;
  from: string;
  to: string;
  label: string;
};

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayKey(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

export function formatDisplayDate(value: string) {
  const date = parseDayKey(value);
  return `${date.getDate()} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

export function formatShortDisplay(value: string) {
  const date = parseDayKey(value);
  return `${date.getDate()} Tháng ${date.getMonth() + 1}, ${String(date.getFullYear()).slice(2)}`;
}

function startOfWeekMonday(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeekSunday(date: Date) {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function computePreset(
  preset: DatePresetId,
  today = startOfDay(new Date()),
): { from: Date; to: Date; label: string } {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (preset) {
    case 'today':
      return { from: today, to: today, label: 'Hôm nay' };
    case 'yesterday':
      return { from: yesterday, to: yesterday, label: 'Hôm qua' };
    case 'maximum': {
      const from = new Date(today);
      from.setDate(from.getDate() - 365);
      return { from, to: today, label: 'Tối đa' };
    }
    case 'today_yesterday':
      return { from: yesterday, to: today, label: 'Hôm nay và hôm qua' };
    case 'last_7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today, label: '7 ngày qua' };
    }
    case 'last_14': {
      const from = new Date(today);
      from.setDate(from.getDate() - 13);
      return { from, to: today, label: '14 ngày qua' };
    }
    case 'last_28': {
      const from = new Date(today);
      from.setDate(from.getDate() - 27);
      return { from, to: today, label: '28 ngày qua' };
    }
    case 'last_30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: today, label: '30 ngày qua' };
    }
    case 'this_week':
      return {
        from: startOfWeekMonday(today),
        to: today,
        label: 'Tuần này',
      };
    case 'last_week': {
      const thisMonday = startOfWeekMonday(today);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(lastSunday.getDate() - 1);
      const lastMonday = startOfWeekMonday(lastSunday);
      return {
        from: lastMonday,
        to: endOfWeekSunday(lastMonday),
        label: 'Tuần trước',
      };
    }
    case 'this_month':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
        label: 'Tháng này',
      };
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from, to, label: 'Tháng trước' };
    }
    default:
      return { from: today, to: today, label: 'Tùy chỉnh' };
  }
}

export function createDateRangeFromPreset(
  preset: DatePresetId,
): DateRangeValue {
  const { from, to, label } = computePreset(preset);
  return {
    preset,
    from: toDayKey(from),
    to: toDayKey(to),
    label,
  };
}

export function formatDateRangeTrigger(value: DateRangeValue) {
  if (value.from === value.to) {
    return `${value.label}: ${formatDisplayDate(value.from)}`;
  }
  if (
    value.preset !== 'custom' &&
    value.preset !== 'today_yesterday' &&
    value.preset !== 'maximum'
  ) {
    return `${value.label}: ${formatShortDisplay(value.from)} – ${formatShortDisplay(value.to)}`;
  }
  return `${formatShortDisplay(value.from)} – ${formatShortDisplay(value.to)}`;
}
