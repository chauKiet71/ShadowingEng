import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Headphones,
  Infinity,
  Subtitles,
  Bookmark,
  Mic,
  Clapperboard,
  Sparkles,
  Shield,
  XCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { formatPrice, getUnitPriceLabel, mapPackageToPlan, type Plan } from '../data/plans';
import { peekCache } from '../lib/prefetchCache';
import { PrefetchKeys, fetchActivePackages } from '../lib/prefetchFeatures';
import type { PackageRow } from '../lib/api';

const features = [
  { icon: Infinity, label: 'Nghe không giới hạn', free: false, premium: true },
  { icon: Mic, label: 'Luyện nói tình huống', free: 'limited', premium: true },
  { icon: Clapperboard, label: 'Dịch video YouTube', free: 'limited', premium: true },
  { icon: Subtitles, label: 'Phụ đề song ngữ', free: 'limited', premium: true },
  { icon: Bookmark, label: 'Lưu & Quản lý yêu thích', free: 'limited', premium: true },
] as const;

function FeatureCell({ value }: { value: boolean | 'limited' }) {
  if (value === true) {
    return <CheckCircle2 size={18} className="text-blue-500 mx-auto" />;
  }
  if (value === 'limited') {
    return <span className="text-[10px] text-gray-400 font-medium">Giới hạn</span>;
  }
  return <XCircle size={18} className="text-gray-300 mx-auto" />;
}

export default function UpgradePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as
    | { from?: string; message?: string }
    | null;
  const backTo = locationState?.from || '/ca-nhan';
  const upgradeMessage = locationState?.message?.trim() || '';

  const cachedPackages = peekCache<PackageRow[]>(PrefetchKeys.packages);
  const [plans, setPlans] = useState<Plan[]>(() =>
    cachedPackages ? cachedPackages.map(mapPackageToPlan) : [],
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (!cachedPackages?.length) return null;
    const mapped = cachedPackages.map(mapPackageToPlan);
    return mapped[1]?.id ?? mapped[0]?.id ?? null;
  });
  const [loading, setLoading] = useState(() => !cachedPackages);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      if (!cachedPackages) setLoading(true);
      setError('');
      try {
        const data = await fetchActivePackages();
        if (cancelled) return;
        const mapped = data.map(mapPackageToPlan);
        setPlans(mapped);
        setSelectedPlanId((prev) => {
          if (prev && mapped.some((p) => p.id === prev)) return prev;
          return mapped[1]?.id ?? mapped[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không thể tải gói đăng ký');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const activePlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <MobileLayout showPlayer={false}>
      <div className="min-h-screen gradient-bg pb-8">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-white/60">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="text-gray-600 p-1 -ml-1"
              aria-label="Quay lại"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="flex-1 text-center font-semibold text-gray-900 pr-7">
              Nâng cấp Premium
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-5">
          {upgradeMessage && (
            <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
              {upgradeMessage}
            </div>
          )}

          <div className="flex items-start gap-3 mb-6">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 leading-snug">
                Mở khóa toàn bộ tiềm năng với{' '}
                <span className="text-primary">Premium</span>
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Trải nghiệm học nghe không giới hạn và tăng tốc trên hành trình
                chinh phục Tiếng Anh.
              </p>
            </div>
            <div className="relative flex-shrink-0 w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-2xl opacity-60" />
              <div className="relative flex flex-col items-center justify-center h-full">
                <Crown size={36} className="text-amber-500 drop-shadow" fill="#fbbf24" />
                <Headphones size={28} className="text-primary -mt-1" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl card-shadow overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center">
              <p className="flex-1 text-sm font-semibold text-gray-900">Premium giúp bạn</p>
              <div className="grid grid-cols-2 gap-2 w-36 text-center">
                <span className="text-xs text-gray-400 font-medium">Miễn phí</span>
                <span className="text-xs font-bold text-white bg-primary rounded-full py-1 px-2">
                  Premium
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {features.map(({ icon: Icon, label, free, premium }) => (
                <div key={label} className="flex items-center px-4 py-3 gap-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <p className="flex-1 text-sm text-gray-700">{label}</p>
                  <div className="grid grid-cols-2 gap-2 w-36 text-center">
                    <FeatureCell value={free} />
                    <div className="bg-purple-50/80 rounded-lg py-1">
                      <FeatureCell value={premium} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-primary" />
            <h3 className="font-bold text-gray-900">Chọn gói phù hợp cho bạn</h3>
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Đang tải gói...</p>
          ) : plans.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Chưa có gói đăng ký. Vui lòng quay lại sau.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative text-left rounded-2xl border-2 p-3 transition-all ${
                      selected
                        ? 'border-primary bg-white card-shadow'
                        : 'border-gray-100 bg-white/80'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white bg-primary px-2 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                    <p className="text-xs font-bold text-gray-900 mt-1">{plan.label}</p>
                    <p className="text-sm font-bold text-primary mt-2 leading-tight">
                      {formatPrice(plan.unitPrice)}
                    </p>
                    <p className="text-[10px] text-gray-400">{getUnitPriceLabel(plan.durationUnit)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      {plan.original && (
                        <p className="text-[10px] text-gray-300 line-through">
                          {formatPrice(plan.original)}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-gray-700">
                        {formatPrice(plan.total)}
                      </p>
                    </div>
                    <div className="flex justify-center mt-2">
                      {selected ? (
                        <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                      ) : (
                        <Circle size={16} className="text-gray-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-between gap-2 mb-6 px-1">
            {[
              { icon: Shield, label: 'Thanh toán an toàn' },
              { icon: XCircle, label: 'Hủy bất kỳ lúc nào' },
              { icon: CheckCircle2, label: 'Không tự động gia hạn' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 flex-1 text-center">
                <Icon size={16} className="text-primary" />
                <span className="text-[9px] text-gray-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={!activePlan}
            onClick={() =>
              activePlan && navigate(`/nang-cap/thanh-toan?package=${activePlan.id}`)
            }
            className="w-full gradient-btn text-white rounded-2xl p-4 flex items-center gap-3 card-shadow hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Crown size={22} fill="white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Nâng cấp ngay</p>
              <p className="text-xs text-white/80">
                {activePlan
                  ? `${formatPrice(activePlan.total)} · Bắt đầu trải nghiệm Premium`
                  : 'Chọn gói để tiếp tục'}
              </p>
            </div>
            <ChevronRight size={22} className="text-white/80" />
          </button>

          <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed px-2">
            Thông tin thanh toán của bạn được bảo mật và an toàn tuyệt đối.
            Bạn có thể hủy gói bất kỳ lúc nào.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
