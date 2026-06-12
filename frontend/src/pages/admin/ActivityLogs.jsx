import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import Header from '../../components/layout/Header';
import SearchInput from '../../components/ui/SearchInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { get, formatDate, getErrorMessage } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';

const actionColors = {
  login: 'bg-blue-100 text-blue-700',
  register: 'bg-green-100 text-green-700',
  transaction: 'bg-purple-100 text-purple-700',
  balance_topup: 'bg-emerald-100 text-emerald-700',
  balance_add: 'bg-emerald-100 text-emerald-700',
  balance_reduce: 'bg-red-100 text-red-700',
  create_user: 'bg-indigo-100 text-indigo-700',
  update_user: 'bg-yellow-100 text-yellow-700',
  delete_user: 'bg-red-100 text-red-700',
  update_margin: 'bg-indigo-100 text-indigo-700',
  update_whatsapp: 'bg-green-100 text-green-700',
  topup_request: 'bg-emerald-100 text-emerald-700',
  topup_request_approve: 'bg-green-100 text-green-700',
  topup_request_reject: 'bg-red-100 text-red-700',
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const debouncedSearch = useDebounce(search);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.ACTIVITY_LOGS.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
      });
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [debouncedSearch, pagination.page, pagination.limit]);

  return (
    <div>
      <Header title="Log Aktivitas" subtitle="Semua aktivitas sistem" />

      <div className="px-4 -mt-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari aktivitas..." />

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <EmptyState title="Belum ada log aktivitas" />
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ScrollText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-900">{log.description}</p>
                    {log.user_name && (
                      <p className="text-xs text-gray-500 mt-1">oleh {log.user_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          onLimitChange={(limit) => setPagination((p) => ({ ...p, limit, page: 1 }))}
        />
      </div>
    </div>
  );
};

export default ActivityLogs;
