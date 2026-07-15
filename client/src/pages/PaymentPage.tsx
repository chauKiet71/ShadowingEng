import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Copy,
  Crown,
  Info,
  Wallet,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import { api, type PaymentOrder } from '../lib/api';
import {
  formatPrice,
  getPlanDurationLabel,
  getPlanEndDate,
  mapPackageToPlan,
  type Plan,
} from '../data/plans';

const steps = [
  { icon: Wallet, label: 'Chuyển khoản đúng thông tin trên' },
  { icon: ClipboardList, label: 'Nhập đúng nội dung chuyển khoản' },
  { icon: CheckCircle2, label: 'Hệ thống xác nhận trong 1-5 phút' },
];

function formatDate(date: Date) {
  return date.toLocaleDateString('vi-VN');
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const userId = user?.id;
  const packageId = searchParams.get('package');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!packageId || !userId) {
      setPlan(null);
      setOrder(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPackage() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getPackage(packageId);
        const paymentOrder = await api.createPaymentOrder(packageId);
        if (!cancelled) {
          setPlan(mapPackageToPlan(data));
          setOrder(paymentOrder);
        }
      } catch (err) {
        if (!cancelled) {
          setPlan(null);
          setOrder(null);
          setError(
            err instanceof Error ? err.message : 'Không thể tạo đơn thanh toán',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPackage();
    return () => {
      cancelled = true;
    };
  }, [authLoading, packageId, userId]);

  useEffect(() => {
    if (!order || order.status !== 'PENDING') return;

    const timer = window.setInterval(() => {
      void api.getPaymentOrder(order.id).then(async (next) => {
        setOrder(next);
        if (next.status === 'PAID') {
          await refreshUser();
          setShowSuccess(true);
        }
      }).catch(() => {
        // Giữ màn hình thanh toán và thử lại ở lần polling sau.
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [order, refreshUser]);

  const dates = useMemo(() => {
    const start = new Date();
    const end = plan ? getPlanEndDate(start, plan) : new Date(start);
    return { start, end };
  }, [plan]);
  const premiumEndDate = user?.premiumExpiresAt
    ? new Date(user.premiumExpiresAt)
    : dates.end;

  if (authLoading || loading) {
    return (
      <MobileLayout showPlayer={false}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-400">Đang tải thông tin gói...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/dang-nhap"
        replace
        state={{ from: `/nang-cap/thanh-toan?package=${packageId ?? ''}` }}
      />
    );
  }

  if (!plan || !order) {
    if (error) {
      return (
        <MobileLayout showPlayer={false}>
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Link to="/nang-cap" className="mt-4 text-sm font-semibold text-primary">
              Quay lại chọn gói
            </Link>
          </div>
        </MobileLayout>
      );
    }
    return <Navigate to="/nang-cap" replace />;
  }

  const transferContent = order.paymentCode;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(transferContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <MobileLayout showPlayer={false}>
      {showSuccess && (
        <div
          className="fixed inset-0 z-[100] bg-gray-950/50 backdrop-blur-sm flex items-center justify-center p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-success-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 px-6 pt-8 pb-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                <CheckCircle2 size={48} className="text-green-500" strokeWidth={2.5} />
              </div>
              <h2
                id="payment-success-title"
                className="mt-5 text-2xl font-bold text-white"
              >
                Nâng cấp thành công!
              </h2>
              <p className="mt-2 text-sm text-green-50">
                Tài khoản của bạn đã được kích hoạt Premium.
              </p>
            </div>

            <div className="-mt-5 px-5 pb-6">
              <div className="mt-[35px] rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Crown size={21} className="text-amber-500" fill="currentColor" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Premium · {plan.label}</p>
                    <p className="text-xs text-gray-500">{getPlanDurationLabel(plan)}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Số tiền</span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(order.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Mã thanh toán</span>
                    <span className="font-semibold text-gray-900">
                      {order.paymentCode}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Hiệu lực đến</span>
                    <span className="font-semibold text-gray-900">
                      {formatDate(premiumEndDate)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-5 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white"
              >
                Bắt đầu học ngay
              </button>
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="mt-2 w-full py-2 text-sm font-medium text-gray-500"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Link to="/nang-cap" className="text-gray-600 p-1 -ml-1">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="flex-1 text-center font-semibold text-gray-900 pr-7">
              Thanh toán
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-5">
          <h2 className="text-xl font-bold text-gray-900">Thanh toán bằng chuyển khoản</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Vui lòng chuyển khoản đúng nội dung để được kích hoạt gói nhanh chóng.
          </p>

          {order.status === 'PAID' && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800">Thanh toán thành công</p>
                <p className="text-xs text-green-700 mt-1">
                  Gói Premium đã được kích hoạt cho tài khoản của bạn.
                </p>
              </div>
            </div>
          )}

          {order.status === 'EXPIRED' && (
            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Đơn thanh toán đã hết hạn. Vui lòng quay lại chọn gói để tạo mã mới.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl card-shadow p-4 mt-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Thông tin đơn hàng</p>

            <div className="flex items-start gap-3 pb-4 border-b border-gray-50">
              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown size={22} className="text-white" fill="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900">Gói Premium</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {plan.label}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-primary bg-indigo-50 px-2 py-1 rounded-full whitespace-nowrap">
                    {getPlanDurationLabel(plan)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 py-4 border-b border-gray-50 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Thời hạn gói</span>
                <span className="text-gray-900 font-medium">{getPlanDurationLabel(plan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày bắt đầu</span>
                <span className="text-gray-900 font-medium">{formatDate(dates.start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày hết hạn</span>
                <span className="text-gray-900 font-medium">{formatDate(dates.end)}</span>
              </div>
              {user && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tài khoản</span>
                  <span className="text-gray-900 font-medium truncate ml-4">{user.email}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-500">Tổng thanh toán</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(order.amount)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl card-shadow p-4 mt-4">
            <p className="text-sm font-bold text-gray-900 mb-4">Thông tin chuyển khoản</p>

            <div className="flex justify-center mb-4">
              <img
                src={order.qrUrl}
                alt={`Mã QR thanh toán ${order.paymentCode}`}
                className="w-64 max-w-full rounded-xl border border-gray-100"
              />
            </div>

            <div className="flex gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0 bg-white">
                <span className="text-[10px] font-bold text-green-700 leading-tight text-center">
                  {order.bank.bank}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Ngân hàng {order.bank.bank}</p>
                <p className="text-lg font-bold text-primary mt-1 tracking-wide">
                  {order.bank.accountNumber}
                </p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  {order.bank.accountHolder}
                </p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Nội dung CK</p>
              <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-indigo-50/50 px-3 py-3">
                <p className="flex-1 text-sm font-bold text-primary break-all">{transferContent}</p>
                <button
                  type="button"
                  onClick={copyContent}
                  className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0"
                  aria-label="Sao chép nội dung chuyển khoản"
                >
                  <Copy size={16} />
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-1.5">Đã sao chép nội dung chuyển khoản</p>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
              <p>
                Vui lòng nhập đúng nội dung chuyển khoản để hệ thống tự động xác nhận.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Hướng dẫn</p>
            <div className="flex items-center justify-between gap-1">
              {steps.map(({ icon: Icon, label }, index) => (
                <div key={label} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center text-center flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <p className="text-[9px] text-gray-500 leading-tight px-1">{label}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight size={14} className="text-gray-300 flex-shrink-0 -mt-6" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 bg-indigo-50 rounded-2xl p-4 flex items-start gap-3">
            <Clock size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Gói Premium sẽ được kích hoạt tự động trong vòng{' '}
              <span className="font-semibold text-gray-800">1-5 phút</span> sau khi chuyển khoản
              thành công. Nếu quá 10 phút chưa được kích hoạt, vui lòng liên hệ hỗ trợ.
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
