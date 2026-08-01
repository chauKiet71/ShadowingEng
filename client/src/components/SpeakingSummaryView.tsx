import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  House,
  Languages,
  RotateCcw,
  Sparkles,
  Star,
  Waves,
} from 'lucide-react';
import type { CompleteSpeakingSessionResponse } from '../lib/api';

type SpeakingSummary = CompleteSpeakingSessionResponse['summary'];

interface SpeakingSummaryViewProps {
  summary: SpeakingSummary;
  onBack: () => void;
  onChooseAnother: () => void;
  onRetry: () => void;
  onHome: () => void;
}

type MetricTone = 'emerald' | 'sky' | 'violet';

const METRIC_STYLES: Record<
  MetricTone,
  { icon: string; score: string; badge: string }
> = {
  emerald: {
    icon: 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/15',
    score: 'text-emerald-300',
    badge: 'bg-emerald-400/10 text-emerald-300',
  },
  sky: {
    icon: 'bg-sky-400/15 text-sky-300 ring-sky-300/15',
    score: 'text-sky-300',
    badge: 'bg-sky-400/10 text-sky-300',
  },
  violet: {
    icon: 'bg-violet-400/15 text-violet-300 ring-violet-300/15',
    score: 'text-violet-300',
    badge: 'bg-violet-400/10 text-violet-300',
  },
};

function getScoreLabel(value: number) {
  if (value >= 90) return 'Xuất sắc';
  if (value >= 75) return 'Tốt';
  if (value >= 60) return 'Khá';
  return 'Cần cố gắng';
}

function getCompletionMessage(value: number) {
  if (value >= 85) return 'Bạn đã hoàn thành xuất sắc!';
  if (value >= 70) return 'Bạn đã hoàn thành rất tốt!';
  if (value >= 50) return 'Bạn đã hoàn thành tốt!';
  return 'Hãy tiếp tục luyện tập nhé!';
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Waves;
  label: string;
  value: number | null;
  tone: MetricTone;
}) {
  const score = Math.round(value ?? 0);
  const styles = METRIC_STYLES[tone];

  return (
    <div className="flex min-h-[118px] min-w-0 flex-col items-center rounded-[20px] border border-white/10 bg-white/[0.055] px-2 py-3 text-center shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ${styles.icon}`}
      >
        <Icon size={21} strokeWidth={2.4} aria-hidden="true" />
      </div>
      <p
        className={`mt-1.5 text-[23px] font-black leading-none ${styles.score}`}
      >
        {score}
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-300">{label}</p>
      <span
        className={`mt-auto rounded-full px-2.5 py-1 text-[9px] font-bold ${styles.badge}`}
      >
        {getScoreLabel(score)}
      </span>
    </div>
  );
}

export default function SpeakingSummaryView({
  summary,
  onBack,
  onChooseAnother,
  onRetry,
  onHome,
}: SpeakingSummaryViewProps) {
  const overall = Math.round(summary.averageOverall ?? 0);
  const completedTurns = Math.max(0, summary.turnsSpoken);

  return (
    <div
      data-testid="speaking-summary"
      className="min-h-[100dvh] overflow-x-hidden bg-[#04091d] px-4 pb-28 pt-5 text-white"
    >
      <header className="relative flex min-h-[64px] items-start justify-center">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition active:scale-95"
          aria-label="Quay lại danh sách tình huống"
        >
          <ArrowLeft size={25} strokeWidth={2.5} />
        </button>

        <div className="relative flex h-11 w-full items-center justify-center px-14 text-center">
          <h1 className="text-[20px] font-black leading-none">Tổng kết</h1>
        </div>
      </header>

      <main>
        <section className="relative min-h-[240px] overflow-hidden rounded-[28px] border border-violet-500/45 bg-[#0a1237] shadow-[0_24px_60px_rgba(23,18,92,0.42)]">
          <img
            src="/images/speaking/summary-hero.png"
            alt="Trợ lý luyện nói đang chúc mừng"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover object-top"
          />
          <div className="absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-[#10174f]/95 via-[#10174f]/78 to-transparent" />

          <div className="relative z-10 flex min-h-[240px] w-[55%] flex-col px-5 py-4">
            <p className="text-[13px] font-medium text-indigo-200">
              Điểm trung bình
            </p>
            <div className="mt-1 flex items-end gap-1.5">
              <p className="text-[62px] font-black leading-none tracking-[-2px]">
                {overall}
              </p>
              <p className="pb-1 text-[20px] font-bold text-indigo-100">/100</p>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold leading-4 text-white">
              <span>{getCompletionMessage(overall)}</span>
              <Sparkles
                size={15}
                className="shrink-0 text-amber-300"
                aria-hidden="true"
              />
            </div>

            <div className="mt-auto rounded-[16px] border border-white/10 bg-[#11183e]/85 p-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_8px_18px_rgba(124,58,237,0.38)]">
                  <Star size={17} fill="currentColor" aria-hidden="true" />
                </span>
                <p className="text-[11px] font-semibold leading-4 text-white">
                  {completedTurns} lượt nói đã hoàn thành
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                  style={{ width: `${Math.min(100, overall)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className="mt-3 grid grid-cols-3 gap-2"
          aria-label="Điểm kỹ năng"
        >
          <SummaryMetric
            icon={Waves}
            label="Lưu loát"
            value={summary.averageFluency}
            tone="emerald"
          />
          <SummaryMetric
            icon={BookOpen}
            label="Ngữ pháp"
            value={summary.averageGrammar}
            tone="sky"
          />
          <SummaryMetric
            icon={Languages}
            label="Từ vựng"
            value={summary.averageVocabulary}
            tone="violet"
          />
        </section>

        <section className="mt-5" aria-label="Hành động tiếp theo">
          <button
            data-summary-action="choose-another"
            type="button"
            onClick={onChooseAnother}
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 px-5 text-[15px] font-extrabold text-white shadow-[0_16px_35px_rgba(75,73,240,0.3)] transition active:scale-[0.98]"
          >
            <span>Chọn tình huống khác</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080d21]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
        aria-label="Điều hướng sau khi hoàn thành"
      >
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2.5">
          <button
            data-summary-action="retry"
            type="button"
            onClick={onRetry}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-white/20 bg-white/[0.045] px-3 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <RotateCcw size={18} aria-hidden="true" />
            Luyện lại
          </button>
          <button
            data-summary-action="home"
            type="button"
            onClick={onHome}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-white/20 bg-white/[0.045] px-3 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <House size={18} fill="currentColor" aria-hidden="true" />
            Về trang chủ
          </button>
        </div>
      </footer>
    </div>
  );
}
