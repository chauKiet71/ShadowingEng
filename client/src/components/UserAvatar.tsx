import { getNameInitials } from '../lib/nameInitials';

const sizeMap = {
  xs: { box: 'w-8 h-8', text: 'text-[10px]' },
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-16 h-16', text: 'text-lg' },
  xl: { box: 'w-20 h-20', text: 'text-xl' },
} as const;

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
  bordered?: boolean;
}

export default function UserAvatar({
  name,
  src,
  size = 'sm',
  className = '',
  bordered = false,
}: UserAvatarProps) {
  const { box, text } = sizeMap[size];
  const borderClass = bordered ? 'border-2 border-primary' : '';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${box} rounded-full object-cover ${borderClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${box} rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center ${borderClass} ${className}`}
      aria-label={name}
    >
      <span className={`${text} font-bold text-white leading-none`}>
        {getNameInitials(name)}
      </span>
    </div>
  );
}
