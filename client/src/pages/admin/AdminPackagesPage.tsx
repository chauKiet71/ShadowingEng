import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Crown,
  Gem,
  Star,
  Infinity,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { api, type PackagePayload, type PackageRow } from '../../lib/api';
import { formatPrice, calcUnitPrice, formatDurationText, type DurationUnit } from '../../data/plans';

const iconMap: Record<string, React.ReactNode> = {
  crown: <Crown size={20} className="text-purple-500" />,
  diamond: <Gem size={20} className="text-green-500" />,
  star: <Star size={20} className="text-orange-500" />,
  infinity: <Infinity size={20} className="text-blue-500" />,
};

const emptyForm: PackagePayload = {
  name: '',
  description: '',
  price: 0,
  duration: '1 tháng',
  durationUnit: 'MONTH',
  days: 0,
  months: 1,
  monthlyPrice: 0,
  originalPrice: null,
  badge: '',
  sortOrder: 0,
  icon: 'crown',
  status: 'ACTIVE',
  isVisible: true,
};

function packageToForm(pkg: PackageRow): PackagePayload {
  return {
    name: pkg.name,
    description: pkg.description ?? '',
    price: pkg.price,
    duration: pkg.duration,
    durationUnit: pkg.durationUnit ?? 'MONTH',
    days: pkg.days ?? 0,
    months: pkg.months,
    monthlyPrice: pkg.monthlyPrice,
    originalPrice: pkg.originalPrice,
    badge: pkg.badge ?? '',
    sortOrder: pkg.sortOrder,
    icon: pkg.icon,
    status: pkg.status,
    isVisible: pkg.isVisible,
  };
}

function getPeriodValue(form: PackagePayload) {
  return form.durationUnit === 'DAY' ? (form.days ?? 1) : (form.months ?? 1);
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PackagePayload>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleFilter, setVisibleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPackage = packages.find((p) => p.id === selectedId);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchSearch =
        !search ||
        pkg.name.toLowerCase().includes(search.toLowerCase()) ||
        (pkg.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || pkg.status === statusFilter;
      const matchVisible =
        visibleFilter === 'ALL' ||
        (visibleFilter === 'VISIBLE' && pkg.isVisible) ||
        (visibleFilter === 'HIDDEN' && !pkg.isVisible);
      return matchSearch && matchStatus && matchVisible;
    });
  }, [packages, search, statusFilter, visibleFilter]);

  const loadPackages = useCallback(async (autoSelect = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPackages();
      setPackages(data);
      if (autoSelect && data.length > 0) {
        setSelectedId(data[0].id);
        setForm(packageToForm(data[0]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách gói');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages(true);
  }, [loadPackages]);

  const selectPackage = (pkg: PackageRow) => {
    setIsCreating(false);
    setSelectedId(pkg.id);
    setForm(packageToForm(pkg));
  };

  const startCreate = () => {
    setIsCreating(true);
    setSelectedId(null);
    setForm({ ...emptyForm });
  };

  const updateField = <K extends keyof PackagePayload>(
    key: K,
    value: PackagePayload[K],
  ) => {
    setForm((prev) => {
      let next = { ...prev, [key]: value };

      if (key === 'durationUnit') {
        const unit = value as DurationUnit;
        if (unit === 'DAY') {
          next.days = prev.days && prev.days > 0 ? prev.days : 7;
          next.months = 0;
          next.duration = formatDurationText('DAY', next.days);
        } else {
          next.months = prev.months && prev.months > 0 ? prev.months : 1;
          next.days = 0;
          next.duration = formatDurationText('MONTH', next.months);
        }
      }

      if (key === 'days' && next.durationUnit === 'DAY') {
        const days = Math.max(1, value as number);
        next.days = days;
        next.duration = formatDurationText('DAY', days);
      }

      if (key === 'months' && next.durationUnit === 'MONTH') {
        const months = Math.max(1, value as number);
        next.months = months;
        next.duration = formatDurationText('MONTH', months);
      }

      if (
        key === 'price' ||
        key === 'durationUnit' ||
        key === 'days' ||
        key === 'months'
      ) {
        const price = key === 'price' ? (value as number) : next.price;
        const durationUnit = next.durationUnit ?? 'MONTH';
        const days = next.days ?? 0;
        const months = next.months ?? 1;
        next.monthlyPrice = calcUnitPrice(price, durationUnit, days, months);
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên gói');
      return;
    }
    if (!form.price || form.price <= 0) {
      setError('Vui lòng nhập giá hợp lệ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload: PackagePayload = {
        ...form,
        description: form.description || undefined,
        badge: form.badge || null,
        originalPrice: form.originalPrice || null,
        durationUnit: form.durationUnit ?? 'MONTH',
        days: form.durationUnit === 'DAY' ? Math.max(1, form.days ?? 1) : 0,
        months: form.durationUnit === 'MONTH' ? Math.max(1, form.months ?? 1) : 0,
        monthlyPrice:
          form.monthlyPrice ||
          calcUnitPrice(
            form.price,
            form.durationUnit ?? 'MONTH',
            form.days ?? 0,
            form.months ?? 1,
          ),
      };

      if (isCreating) {
        const created = await api.createPackage(payload);
        setIsCreating(false);
        setSelectedId(created.id);
        setForm(packageToForm(created));
      } else if (selectedId) {
        const updated = await api.updatePackage(selectedId, payload);
        setForm(packageToForm(updated));
      }

      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu gói');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa gói này?')) return;

    setError('');
    try {
      await api.deletePackage(id);
      if (selectedId === id) {
        setSelectedId(null);
        setIsCreating(false);
        setForm({ ...emptyForm });
      }
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa gói');
    }
  };

  const formTitle = isCreating
    ? 'Tạo gói mới'
    : selectedPackage
      ? `Chỉnh sửa gói: ${selectedPackage.name}`
      : 'Chọn hoặc tạo gói';

  return (
    <AdminLayout
      title="Gói đăng ký"
      subtitle="Quản lý và tùy chỉnh các gói dịch vụ trong ứng dụng"
      actions={
        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-2 gradient-btn text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> Tạo gói mới
        </button>
      }
    >
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm gói..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="PAUSED">Tạm dừng</option>
          </select>
          <select
            value={visibleFilter}
            onChange={(e) => setVisibleFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="ALL">Hiển thị: Tất cả</option>
            <option value="VISIBLE">Đang hiển thị</option>
            <option value="HIDDEN">Ẩn</option>
          </select>
          <button
            type="button"
            onClick={loadPackages}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Làm mới"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-gray-500 text-left">
                <th className="p-4 font-medium">Tên gói</th>
                <th className="p-4 font-medium">Giá (VNĐ)</th>
                <th className="p-4 font-medium">Thời hạn</th>
                <th className="p-4 font-medium">Người dùng</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && packages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Chưa có gói nào
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    onClick={() => selectPackage(pkg)}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 ${
                      selectedId === pkg.id && !isCreating ? 'bg-purple-50/50' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
                          {iconMap[pkg.icon] ?? iconMap.crown}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{pkg.name}</p>
                          <p className="text-xs text-gray-400">{pkg.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      {formatPrice(pkg.price)}
                      <span className="text-gray-400 font-normal">
                        {' '}
                        · {formatPrice(pkg.monthlyPrice)}
                        {pkg.durationUnit === 'DAY' ? '/ngày' : '/tháng'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{pkg.duration}</td>
                    <td className="p-4 text-gray-600">
                      {(pkg.userCount ?? 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          pkg.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {pkg.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectPackage(pkg);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary rounded"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pkg.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 text-sm text-gray-500 border-t border-gray-50">
          Hiển thị {filteredPackages.length} / {packages.length} gói
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">{formTitle}</h3>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tên gói *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Giá tổng (VNĐ) *</label>
              <input
                type="number"
                value={form.price || ''}
                onChange={(e) => updateField('price', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mô tả</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Đơn vị thời hạn *</label>
              <select
                value={form.durationUnit ?? 'MONTH'}
                onChange={(e) => updateField('durationUnit', e.target.value as DurationUnit)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="MONTH">Tháng</option>
                <option value="DAY">Ngày</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {form.durationUnit === 'DAY' ? 'Số ngày *' : 'Số tháng *'}
              </label>
              <input
                type="number"
                min={1}
                value={getPeriodValue(form) || ''}
                onChange={(e) =>
                  updateField(
                    form.durationUnit === 'DAY' ? 'days' : 'months',
                    Number(e.target.value),
                  )
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {form.durationUnit === 'DAY' ? 'Giá / ngày (VNĐ)' : 'Giá / tháng (VNĐ)'}
              </label>
              <input
                type="number"
                value={form.monthlyPrice || ''}
                onChange={(e) => updateField('monthlyPrice', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Giá gốc (gạch ngang)</label>
              <input
                type="number"
                value={form.originalPrice ?? ''}
                onChange={(e) =>
                  updateField(
                    'originalPrice',
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nhãn khuyến mãi</label>
              <input
                type="text"
                placeholder="VD: Tiết kiệm 33%"
                value={form.badge ?? ''}
                onChange={(e) => updateField('badge', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Thời hạn hiển thị *</label>
              <input
                type="text"
                placeholder={form.durationUnit === 'DAY' ? 'VD: 7 ngày' : 'VD: 3 tháng'}
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Thứ tự hiển thị</label>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => updateField('sortOrder', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Icon</label>
              <select
                value={form.icon ?? 'crown'}
                onChange={(e) => updateField('icon', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="crown">Crown</option>
                <option value="diamond">Diamond</option>
                <option value="star">Star</option>
                <option value="infinity">Infinity</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-6 md:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.status === 'ACTIVE'}
                  onChange={(e) =>
                    updateField('status', e.target.checked ? 'ACTIVE' : 'PAUSED')
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">Đang hoạt động</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVisible ?? true}
                  onChange={(e) => updateField('isVisible', e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">Hiển thị trên ứng dụng</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (isCreating) {
                setIsCreating(false);
                if (packages[0]) selectPackage(packages[0]);
              } else if (selectedPackage) {
                setForm(packageToForm(selectedPackage));
              }
            }}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : isCreating ? 'Tạo gói' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
