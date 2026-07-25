import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const heroSlides = [
  {
    src: '/images/home-hero-banner.png',
    alt: 'Nghe chủ động – Nói tự nhiên. Lắng nghe – Bắt chước – Tiến bộ mỗi ngày',
    to: '/kham-pha',
    label: 'Bắt đầu nghe',
  },
  {
    src: '/images/home-hero-upgrade.png',
    alt: 'Nâng cấp ngay – Mở khóa toàn bộ bài học',
    to: '/nang-cap',
    label: 'Nâng cấp ngay',
  },
] as const;

const AUTO_MS = 3000;

export default function HeroBannerSlider() {
  const [index, setIndex] = useState(0);
  const [withTransition, setWithTransition] = useState(true);

  // Clone slide đầu ở cuối để loop phải → trái mượt
  const trackSlides = [...heroSlides, heroSlides[0]];
  const activeDot = index % heroSlides.length;

  useEffect(() => {
    const id = window.setInterval(() => {
      setWithTransition(true);
      setIndex((prev) => (prev >= heroSlides.length ? prev : prev + 1));
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (withTransition) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWithTransition(true));
    });
    return () => cancelAnimationFrame(id);
  }, [withTransition]);

  const handleTransitionEnd = () => {
    if (index < heroSlides.length) return;
    setWithTransition(false);
    setIndex(0);
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(37,99,235,0.15)]"
      aria-roledescription="carousel"
      aria-label="Banner trang chủ"
    >
      <div
        className={`flex ease-out ${withTransition ? 'transition-transform duration-500' : ''}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {trackSlides.map((slide, i) => (
          <Link
            key={`${slide.src}-${i}`}
            to={slide.to}
            className="block w-full shrink-0"
            aria-label={slide.label}
            aria-hidden={i !== index}
            tabIndex={i !== index ? -1 : undefined}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              className="w-full h-auto block"
              draggable={false}
            />
          </Link>
        ))}
      </div>

      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {heroSlides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Chuyển đến banner ${i + 1}`}
            aria-current={i === activeDot}
            onClick={() => {
              setWithTransition(true);
              setIndex(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === activeDot ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
