import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { useLevel } from '../contexts/LevelContext';
import type { UserLevelId } from '../data/userLevels';

export default function LevelPage() {
  const navigate = useNavigate();
  const { level, setLevel, options } = useLevel();
  const [selected, setSelected] = useState<UserLevelId>(level);

  const handleSave = () => {
    setLevel(selected);
    navigate('/ca-nhan', { replace: true });
  };

  return (
    <MobileLayout showPlayer={false}>
      <div className="min-h-screen gradient-bg pb-8">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-white/60">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Link to="/ca-nhan" className="text-gray-600 p-1 -ml-1">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="flex-1 text-center font-semibold text-gray-900 pr-7">
              Trình độ
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6">
          <h2 className="text-xl font-bold text-gray-900 text-center">Trình độ hiện tại</h2>
          <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed px-2">
            Thông tin này để ứng dụng gợi ý những nội dung phù hợp với trình độ của bạn
          </p>

          <div className="bg-white rounded-2xl card-shadow mt-6 overflow-hidden divide-y divide-gray-50">
            {options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                    isSelected ? option.selectedBg : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${option.iconBg}`}
                  >
                    {option.icon}
                  </div>
                  <span className={`flex-1 font-semibold text-base ${option.textColor}`}>
                    {option.label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? `${option.selectedBorder} border-current`
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          option.id === 'beginner'
                            ? 'bg-blue-500'
                            : option.id === 'intermediate'
                              ? 'bg-green-500'
                              : option.id === 'good'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full gradient-btn text-white font-semibold py-3.5 rounded-2xl mt-8 card-shadow hover:opacity-95 transition-opacity"
          >
            Lưu
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
