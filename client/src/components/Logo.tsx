import { Headphones } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 32 : 24;
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Headphones size={iconSize} className="text-blue-500" />
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-0.5 bg-blue-400 rounded-full" style={{ height: `${4 + i * 2}px` }} />
          ))}
        </div>
      </div>
      {showText && (
        <div className={`${textSize} leading-tight text-left`}>
          <span className="font-bold text-gray-900">Shadowing</span>
          <br />
          <span className="font-bold text-blue-500 text-xs tracking-wider">ENGLISH</span>
        </div>
      )}
    </div>
  );
}
