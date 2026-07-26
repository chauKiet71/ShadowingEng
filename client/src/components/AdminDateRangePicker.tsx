import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  computePreset,
  createDateRangeFromPreset,
  formatDateRangeTrigger,
  formatShortDisplay,
  parseDayKey,
  toDayKey,
  startOfDay,
  type DatePresetId,
  type DateRangeValue,
} from '../lib/adminDateRange';

export type { DatePresetId, DateRangeValue };
export { createDateRangeFromPreset, formatDateRangeTrigger };

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_LABELS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

const PRESET_GROUPS: Array<{
  title?: string;
  items: Array<{ id: DatePresetId; label: string }>;
}> = [
  {
    title: 'Đã dùng mới đây',
    items: [
      { id: 'today', label: 'Hôm nay' },
      { id: 'yesterday', label: 'Hôm qua' },
      { id: 'maximum', label: 'Tối đa' },
    ],
  },
  {
    items: [
      { id: 'today', label: 'Hôm nay' },
      { id: 'yesterday', label: 'Hôm qua' },
      { id: 'today_yesterday', label: 'Hôm nay và hôm qua' },
      { id: 'last_7', label: '7 ngày qua' },
      { id: 'last_14', label: '14 ngày qua' },
      { id: 'last_28', label: '28 ngày qua' },
      { id: 'last_30', label: '30 ngày qua' },
      { id: 'this_week', label: 'Tuần này' },
      { id: 'last_week', label: 'Tuần trước' },
      { id: 'this_month', label: 'Tháng này' },
      { id: 'last_month', label: 'Tháng trước' },
    ],
  },
];

function MonthCalendar({
  month,
  from,
  to,
  hoverDay,
  onSelect,
  onHover,
  onChangeMonth,
  showNavLeft,
  showNavRight,
}: {
  month: Date;
  from: string | null;
  to: string | null;
  hoverDay: string | null;
  onSelect: (day: string) => void;
  onHover: (day: string | null) => void;
  onChangeMonth: (next: Date) => void;
  showNavLeft?: boolean;
  showNavRight?: boolean;
}) {
  const todayKey = toDayKey(startOfDay(new Date()));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const fromDate = from ? parseDayKey(from) : null;
  const toDate = to ? parseDayKey(to) : null;
  const hoverDate = hoverDay ? parseDayKey(hoverDay) : null;

  let rangeStart = fromDate;
  let rangeEnd = toDate;
  if (fromDate && !toDate && hoverDate) {
    if (hoverDate < fromDate) {
      rangeStart = hoverDate;
      rangeEnd = fromDate;
    } else {
      rangeEnd = hoverDate;
    }
  }

  const cells: ReactNode[] = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push(<div key={`pad-${i}`} className="h-8" />);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const key = toDayKey(date);
    const isFuture = key > todayKey;
    const isStart = from === key;
    const isEnd = to === key;
    const inRange =
      rangeStart &&
      rangeEnd &&
      date >= rangeStart &&
      date <= rangeEnd &&
      !(isStart || isEnd);

    cells.push(
      <button
        key={key}
        type="button"
        disabled={isFuture}
        onMouseEnter={() => onHover(key)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(key)}
        className={`h-8 w-8 mx-auto flex items-center justify-center text-sm rounded-full transition-colors ${
          isFuture
            ? 'text-gray-300 cursor-not-allowed'
            : isStart || isEnd
              ? 'bg-[#1877f2] text-white font-semibold'
              : inRange
                ? 'bg-[#e7f3ff] text-[#1877f2]'
                : 'text-gray-800 hover:bg-gray-100'
        }`}
      >
        {day}
      </button>,
    );
  }

  return (
    <div className="w-[240px]">
      <div className="flex items-center justify-between mb-3 px-1">
        {showNavLeft ? (
          <button
            type="button"
            onClick={() => onChangeMonth(addMonths(month, -1))}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <span className="w-7" />
        )}
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
          <span>{MONTH_LABELS[monthIndex]}</span>
          <span className="text-gray-400">▾</span>
          <span>{year}</span>
          <span className="text-gray-400">▾</span>
        </div>
        {showNavRight ? (
          <button
            type="button"
            onClick={() => onChangeMonth(addMonths(month, 1))}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Tháng sau"
          >
            <ChevronRight size={18} />
          </button>
        ) : (
          <span className="w-7" />
        )}
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="h-7 flex items-center justify-center text-[11px] font-medium text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">{cells}</div>
    </div>
  );
}

interface AdminDateRangePickerProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
}

export default function AdminDateRangePicker({
  value,
  onChange,
}: AdminDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState<DatePresetId>(value.preset);
  const [draftFrom, setDraftFrom] = useState<string | null>(value.from);
  const [draftTo, setDraftTo] = useState<string | null>(value.to);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [leftMonth, setLeftMonth] = useState(() => {
    const fromMonth = parseDayKey(value.from);
    return new Date(fromMonth.getFullYear(), fromMonth.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftPreset(value.preset);
    setDraftFrom(value.from);
    setDraftTo(value.to);
    const fromMonth = parseDayKey(value.from);
    setLeftMonth(new Date(fromMonth.getFullYear(), fromMonth.getMonth(), 1));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  const applyPreset = (preset: DatePresetId) => {
    const next = computePreset(preset);
    setDraftPreset(preset);
    setDraftFrom(toDayKey(next.from));
    setDraftTo(toDayKey(next.to));
    setLeftMonth(new Date(next.from.getFullYear(), next.from.getMonth(), 1));
  };

  const onSelectDay = (day: string) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(day);
      setDraftTo(null);
      setDraftPreset('custom');
      return;
    }
    if (day < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(day);
    } else {
      setDraftTo(day);
    }
    setDraftPreset('custom');
  };

  const canApply = !!(draftFrom && draftTo);

  const handleApply = () => {
    if (!draftFrom || !draftTo) return;
    const label =
      draftPreset === 'custom'
        ? 'Tùy chỉnh'
        : computePreset(draftPreset).label;
    onChange({
      preset: draftPreset,
      from: draftFrom,
      to: draftTo,
      label,
    });
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <CalendarDays size={16} className="text-gray-500" />
        <span>{formatDateRangeTrigger(value)}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 flex rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <aside className="w-48 border-r border-gray-100 py-3 max-h-[420px] overflow-y-auto">
            {PRESET_GROUPS.map((group, groupIndex) => (
              <div key={group.title ?? `group-${groupIndex}`} className="mb-2">
                {group.title && (
                  <p className="px-4 pb-1.5 text-xs font-semibold text-gray-500">
                    {group.title}
                  </p>
                )}
                {groupIndex > 0 && (
                  <div className="mx-3 mb-2 border-t border-gray-100" />
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const selected = draftPreset === item.id;
                    return (
                      <button
                        key={`${groupIndex}-${item.id}`}
                        type="button"
                        onClick={() => applyPreset(item.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm text-left transition-colors ${
                          selected
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selected
                              ? 'border-[#1877f2]'
                              : 'border-gray-300'
                          }`}
                        >
                          {selected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#1877f2]" />
                          )}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          <div className="p-4 w-[540px]">
            <div className="flex gap-6 justify-center">
              <MonthCalendar
                month={leftMonth}
                from={draftFrom}
                to={draftTo}
                hoverDay={hoverDay}
                onSelect={onSelectDay}
                onHover={setHoverDay}
                onChangeMonth={setLeftMonth}
                showNavLeft
              />
              <MonthCalendar
                month={rightMonth}
                from={draftFrom}
                to={draftTo}
                hoverDay={hoverDay}
                onSelect={onSelectDay}
                onHover={setHoverDay}
                onChangeMonth={(next) => setLeftMonth(addMonths(next, -1))}
                showNavRight
              />
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={compare}
                  onChange={(e) => setCompare(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#1877f2] focus:ring-[#1877f2]"
                />
                So sánh
              </label>

              {compare && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                    defaultValue="today"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="yesterday">Hôm qua</option>
                    <option value="prev_period">Kỳ trước</option>
                  </select>
                  <input
                    readOnly
                    value={draftFrom ? formatShortDisplay(draftFrom) : '—'}
                    className="w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                  />
                  <input
                    readOnly
                    value={draftTo ? formatShortDisplay(draftTo) : '—'}
                    className="w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
              )}

              <div className="flex items-end justify-between gap-3 pt-1">
                <p className="text-[11px] text-gray-400">
                  Ngày hiển thị theo Giờ TP Hồ Chí Minh
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!canApply}
                    onClick={handleApply}
                    className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166fe5] disabled:opacity-50"
                  >
                    Cập nhật
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
