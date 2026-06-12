import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { get, formatCurrency, formatDate, getErrorMessage } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';

const typeLabels = { topup: 'Topup', add: 'Tambah', reduce: 'Kurangi', purchase: 'Pembelian', refund: 'Refund' };

const BalanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.BALANCE.HISTORY, {
        page: pagination.page,
        limit: pagination.limit,
      });
      setHistory(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.limit]);

  return (
    <div>
      <Header title="Riwayat Saldo" subtitle="Perubahan saldo Anda" />

      <div className="px-4 -mt-4">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : history.length === 0 ? (
          <EmptyState title="Belum ada riwayat saldo" />
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{typeLabels[item.type]}</p>
                    <p className="text-lg font-bold text-primary-600">{formatCurrency(item.amount)}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatCurrency(item.balance_before)} → {formatCurrency(item.balance_after)}
                </p>
                {item.note && <p className="text-xs text-gray-400 mt-1">{item.note}</p>}
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

export default BalanceHistory;
