import {
  AlertCircle,
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  Volume2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { VocabularyLookupDetail } from '../lib/api';

const CLOSE_ANIMATION_MS = 240;

interface LessonWordDetailSheetProps {
  detail: VocabularyLookupDetail | null;
  error: string;
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSave: () => void;
  onSpeak: (text: string) => void;
  onLookupRelated: (word: string) => void;
}

export default function LessonWordDetailSheet({
  detail,
  error,
  loading,
  saving,
  onClose,
  onRetry,
  onSave,
  onSpeak,
  onLookupRelated,
}: LessonWordDetailSheetProps) {
  const saved = !!detail?.progress;
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const requestClose = () => {
    if (closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }

    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, CLOSE_ANIMATION_MS);
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 backdrop-blur-[2px] ${
        closing
          ? 'lesson-word-backdrop-out pointer-events-none'
          : 'lesson-word-backdrop-in'
      }`}
      onClick={requestClose}
      role="presentation"
      data-state={closing ? 'closing' : 'open'}
    >
      <section
        data-testid="lesson-word-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-word-detail-title"
        onClick={(event) => event.stopPropagation()}
        className={`flex h-[82dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[24px] bg-white text-slate-900 shadow-[0_-24px_70px_rgba(15,23,42,0.24)] will-change-transform dark:bg-neutral-950 dark:text-white ${
          closing ? 'lesson-word-sheet-out' : 'lesson-word-sheet-in'
        }`}
      >
        <header className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white/95 px-5 pb-4 pt-2 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95">
          <div className="mx-auto h-1 w-12 rounded-full bg-slate-300 dark:bg-neutral-700" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2 id="lesson-word-detail-title" className="text-[18px] font-bold">
              Chi tiết từ vựng
            </h2>
            <button
              type="button"
              onClick={requestClose}
              disabled={closing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95 dark:bg-white/10 dark:text-white"
              aria-label="Đóng chi tiết từ vựng"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
            <Loader2
              size={32}
              className="animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-semibold">Đang tra cứu từ...</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Đang chọn nghĩa phù hợp với câu trong bài nghe.
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
            <AlertCircle
              size={32}
              className="text-red-500"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          </div>
        ) : detail ? (
          <>
            <div className="shrink-0 px-5 pb-5 pt-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-[30px] font-black leading-none text-primary">
                    {detail.word}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onSpeak(detail.word)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                    aria-label={`Nghe phát âm từ ${detail.word}`}
                  >
                    <Volume2 size={18} aria-hidden="true" />
                  </button>
                </div>
                {detail.phonetic && (
                  <p className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">
                    {detail.phonetic}
                  </p>
                )}
                {detail.partOfSpeech && (
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {detail.partOfSpeech}
                  </p>
                )}
              </div>

              {detail.synonyms.length > 0 && (
                <div
                  className="mt-5 flex flex-wrap gap-2"
                  aria-label="Từ đồng nghĩa"
                >
                  {detail.synonyms.map((synonym) => (
                    <button
                      key={synonym}
                      type="button"
                      onClick={() => onLookupRelated(synonym)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    >
                      {synonym}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-5 dark:border-white/10">
              <h3 className="text-sm font-bold text-primary">Nghĩa</h3>
              <p className="mt-2 text-[16px] font-semibold leading-6">
                {detail.meaning}
              </p>
              {detail.definition !== detail.meaning && (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {detail.definition}
                </p>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-5 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-primary">Ví dụ</h3>
                <button
                  type="button"
                  onClick={() => onSpeak(detail.example)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                  aria-label="Nghe câu ví dụ"
                >
                  <Volume2 size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-sm font-medium leading-6">
                {detail.example}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {detail.exampleTranslation}
              </p>
            </div>

            <footer className="sticky bottom-0 mt-auto shrink-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95">
              <button
                data-testid="save-lesson-word"
                type="button"
                onClick={onSave}
                disabled={saving || saved}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:bg-emerald-500"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : saved ? (
                  <BookmarkCheck size={19} aria-hidden="true" />
                ) : (
                  <BookmarkPlus size={19} aria-hidden="true" />
                )}
                {saving
                  ? 'Đang lưu...'
                  : saved
                    ? 'Đã lưu từ vựng'
                    : 'Lưu từ vựng'}
              </button>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}
