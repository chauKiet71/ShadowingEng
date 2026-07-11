import {
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  visibleItems?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  hideScrollbar?: boolean;
}

export default function HorizontalScroll({
  children,
  className = '',
  visibleItems,
  autoPlay = false,
  autoPlayInterval = 3000,
  hideScrollbar = false,
}: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const pausedRef = useRef(false);

  const stopDrag = useCallback(() => {
    const el = ref.current;
    drag.current.active = false;
    if (el) el.classList.remove('is-dragging');
  }, []);

  const updateItemWidth = useCallback(() => {
    const el = ref.current;
    if (!el || !visibleItems) return;
    const gap = 12;
    const style = window.getComputedStyle(el);
    const paddingX =
      (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const contentWidth = el.clientWidth - paddingX;
    const width = (contentWidth - gap * (visibleItems - 1)) / visibleItems;
    el.style.setProperty('--carousel-item-width', `${Math.max(width, 0)}px`);
  }, [visibleItems]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    updateItemWidth();
    const observer = new ResizeObserver(updateItemWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateItemWidth]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el || !drag.current.active) return;

      e.preventDefault();
      const x = e.pageX - el.getBoundingClientRect().left;
      const delta = x - drag.current.startX;

      if (Math.abs(delta) > 4) {
        drag.current.moved = true;
      }

      el.scrollLeft = drag.current.scrollLeft - delta;
    };

    const onMouseUp = () => stopDrag();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [stopDrag]);

  useEffect(() => {
    if (!autoPlay) return;
    const el = ref.current;
    if (!el) return;

    const getStep = () => {
      const firstItem = el.querySelector<HTMLElement>('[data-carousel-item]');
      return firstItem ? firstItem.offsetWidth + 12 : el.clientWidth / 2;
    };

    const tick = () => {
      if (pausedRef.current || drag.current.active) return;
      const step = getStep();
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      if (el.scrollLeft >= maxScroll - 2) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollTo({ left: el.scrollLeft + step, behavior: 'smooth' });
      }
    };

    const interval = window.setInterval(tick, autoPlayInterval);
    return () => window.clearInterval(interval);
  }, [autoPlay, autoPlayInterval]);

  const onMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, label')) {
      return;
    }

    drag.current = {
      active: true,
      startX: e.pageX - el.getBoundingClientRect().left,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.classList.add('is-dragging');
  };

  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!drag.current.moved) return;

    const target = e.target as HTMLElement;
    if (target.closest('a, button')) {
      e.preventDefault();
      e.stopPropagation();
    }
    drag.current.moved = false;
  };

  return (
    <div
      ref={ref}
      className={`scroll-x scroll-x-interactive ${hideScrollbar ? 'scroll-x-hidden no-scrollbar' : ''} ${className}`}
      onMouseDown={onMouseDown}
      onMouseLeave={() => {
        stopDrag();
        pausedRef.current = false;
      }}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
