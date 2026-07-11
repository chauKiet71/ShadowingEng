export type UserLevelId = 'beginner' | 'intermediate' | 'good' | 'advanced';

export interface UserLevelOption {
  id: UserLevelId;
  label: string;
  icon: string;
  textColor: string;
  iconBg: string;
  selectedBg: string;
  selectedBorder: string;
}

export const userLevelOptions: UserLevelOption[] = [
  {
    id: 'beginner',
    label: 'Mới bắt đầu',
    icon: '🍃',
    textColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    selectedBg: 'bg-blue-50',
    selectedBorder: 'border-blue-400',
  },
  {
    id: 'intermediate',
    label: 'Trung bình',
    icon: '🌱',
    textColor: 'text-green-600',
    iconBg: 'bg-green-100',
    selectedBg: 'bg-green-50',
    selectedBorder: 'border-green-400',
  },
  {
    id: 'good',
    label: 'Khá',
    icon: '🌼',
    textColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    selectedBg: 'bg-amber-50',
    selectedBorder: 'border-amber-400',
  },
  {
    id: 'advanced',
    label: 'Giỏi',
    icon: '🍎',
    textColor: 'text-red-600',
    iconBg: 'bg-red-100',
    selectedBg: 'bg-red-50',
    selectedBorder: 'border-red-400',
  },
];

export function getUserLevelLabel(id: UserLevelId): string {
  return userLevelOptions.find((o) => o.id === id)?.label ?? 'Mới bắt đầu';
}
