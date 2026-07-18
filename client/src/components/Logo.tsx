interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const iconClass =
    size === 'sm'
      ? 'h-9 w-9'
      : size === 'lg'
        ? 'h-14 w-14'
        : 'h-11 w-11';
  const imageClass =
    size === 'sm'
      ? 'h-[58px] w-[58px]'
      : size === 'lg'
        ? 'h-[90px] w-[90px]'
        : 'h-[72px] w-[72px]';
  const textClass =
    size === 'sm'
      ? 'text-xl'
      : size === 'lg'
        ? 'text-3xl'
        : 'text-2xl';

  return (
    <div className="flex items-center gap-2">
      <div className={`relative shrink-0 overflow-hidden rounded-full bg-white ${iconClass}`}>
        <img
          src="/brand/hihi-icon.png"
          alt=""
          className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 ${imageClass}`}
        />
      </div>
      {showText && (
        <span
          className={`bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text font-extrabold leading-none tracking-tight text-transparent ${textClass}`}
        >
          HiHiEnglish
        </span>
      )}
    </div>
  );
}
