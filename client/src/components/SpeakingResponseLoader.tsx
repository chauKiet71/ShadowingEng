import { Ellipsis } from 'lucide-react';

export default function SpeakingResponseLoader() {
  return (
    <div
      className="flex h-12 min-w-[58px] items-center justify-center rounded-[20px] rounded-br-md bg-violet-600 px-3 shadow-sm"
      role="status"
      aria-label="Đang chờ phản hồi"
    >
      <Ellipsis
        size={30}
        strokeWidth={3.2}
        className="animate-pulse text-white motion-reduce:animate-none"
        aria-hidden="true"
      />
    </div>
  );
}
