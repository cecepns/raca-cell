import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import SearchInput from '../components/ui/SearchInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import { get, formatCurrency, formatDate, getErrorMessage } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';

const statusColors = {
  success: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const statusLabels = { success: 'Sukses', pending: 'Pending', failed: 'Gagal' };

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const debouncedSearch = useDebounce(search);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.TRANSACTIONS.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status,
      });
      setTransactions(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, status, pagination.page, pagination.limit]);

  return (
    <div>
      <Header title="Riwayat Transaksi" subtitle="Semua transaksi Anda" />

      <div className="px-4 -mt-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nomor/ref..." />

        <div className="flex gap-2">
          {['', 'success', 'pending', 'failed'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatus(s); setPagination((p) => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                status === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s ? statusLabels[s] : 'Semua'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : transactions.length === 0 ? (
          <EmptyState title="Belum ada transaksi" />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{tx.product_name}</p>
                    <p className="text-xs text-gray-500">{tx.customer_no}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tx.status]}`}>
                    {statusLabels[tx.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-primary-600">{formatCurrency(tx.selling_price)}</span>
                  <span className="text-gray-400 text-xs">{formatDate(tx.created_at)}</span>
                </div>
                {tx.sn && <p className="text-xs text-gray-500 mt-1">SN: {tx.sn}</p>}
                <p className="text-xs text-gray-400 mt-1">Ref: {tx.ref_id}</p>
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

export default Transactions;
