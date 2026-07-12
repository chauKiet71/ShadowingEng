import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, LockOpen, Search } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../lib/api';
import { categories, getCategoryById } from '../../data/categories';
import { lessons, formatLevelLabel } from '../../data/lessons';
import { formatDuration } from '../../data/mockData';

type FilterTab = 'all' | 'locked' | 'unlocked';

export default function AdminLessonsPage() {
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const map = await api.getLessonAccessMap();
      setAccessMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải trạng thái khóa bài học');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const isLocked = useCallback(
    (lessonId: string) => accessMap[lessonId] === true,
    [accessMap],
  );

  const toggleLock = async (lessonId: string, nextLocked: boolean) => {
    setSavingId(lessonId);
    setError('');
    try {
      await api.setLessonAccess(lessonId, nextLocked);
      setAccessMap((prev) => ({ ...prev, [lessonId]: nextLocked }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái khóa');
    } finally {
      setSavingId(null);
    }
  };

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (categoryId !== 'all' && lesson.categoryId !== categoryId) return false;
      const locked = isLocked(lesson.id);
      if (filterTab === 'locked' && !locked) return false;
      if (filterTab === 'unlocked' && locked) return false;
      if (!query) return true;
      return (
        lesson.title.toLowerCase().includes(query) ||
        lesson.id.toLowerCase().includes(query) ||
        lesson.topic.toLowerCase().includes(query)
      );
    });
  }, [search, categoryId, filterTab, isLocked]);

  const lockedCount = useMemo(
    () => lessons.filter((lesson) => isLocked(lesson.id)).length,
    [isLocked],
  );

  return (
    <AdminLayout
      title="Quản lý khóa bài học"
      subtitle="Bài bị khóa chỉ thành viên Pro mới nghe được. Bài mới thêm vào JSON mặc định đang mở."
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{lessons.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Tổng bài học (JSON)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-red-600">{lockedCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Bài đang khóa (Pro)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-green-600">{lessons.length - lockedCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Bài đang mở</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã bài..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">Tất cả chủ đề</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {([
              ['all', 'Tất cả'],
              ['locked', 'Đang khóa'],
              ['unlocked', 'Đang mở'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterTab(id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTab === id
                    ? 'bg-purple-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Bài học</th>
                <th className="px-4 py-3 font-medium">Chủ đề</th>
                <th className="px-4 py-3 font-medium">Trình độ</th>
                <th className="px-4 py-3 font-medium">Thời lượng</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Khóa Pro</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Không có bài học phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLessons.map((lesson) => {
                  const locked = isLocked(lesson.id);
                  const saving = savingId === lesson.id;
                  return (
                    <tr key={lesson.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lesson.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{lesson.id}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {getCategoryById(lesson.categoryId)?.name ?? lesson.topic}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {formatLevelLabel(lesson.level)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDuration(lesson.duration)}
                      </td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                            <Lock size={12} />
                            Khóa Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <LockOpen size={12} />
                            Đang mở
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void toggleLock(lesson.id, !locked)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${
                            locked ? 'bg-red-500' : 'bg-gray-300'
                          }`}
                          aria-label={locked ? 'Mở khóa bài học' : 'Khóa bài học Pro'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              locked ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
