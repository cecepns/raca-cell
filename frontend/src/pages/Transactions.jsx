import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Receipt } from 'lucide-react';
import Header from '../components/layout/Header';
import SearchInput from '../components/ui/SearchInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import ReceiptModal from '../components/receipt/ReceiptModal';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { get, post, formatCurrency, formatDate, getErrorMessage } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { getReceiptStoreName } from '../utils/receipt';

const statusColors = {
  success: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const statusLabels = { success: 'Sukses', pending: 'Pending', failed: 'Gagal' };

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [checkingId, setCheckingId] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const debouncedSearch = useDebounce(search);
  const partnerName = getReceiptStoreName(user?.partner_name);

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

  const handleCheckStatus = async (tx) => {
    setCheckingId(tx.id);
    try {
      const res = await post(API_ENDPOINTS.TRANSACTIONS.CHECK_STATUS(tx.id));
      toast.success(res.message || 'Status diperbarui');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div>
      <Header title="Riwayat Transaksi" subtitle={partnerName} />

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
                {tx.message && tx.status !== 'success' && (
                  <p className="text-xs text-gray-500 mt-1">{tx.message}</p>
                )}
                <div className="flex items-center justify-between mt-2 gap-2">
                  <p className="text-xs text-gray-400 truncate">Ref: {tx.ref_id}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {tx.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleCheckStatus(tx)}
                        disabled={checkingId === tx.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${checkingId === tx.id ? 'animate-spin' : ''}`} />
                        {checkingId === tx.id ? 'Mengecek...' : 'Cek Status'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                    >
                      <Receipt className="w-3 h-3" />
                      Struk
                    </button>
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

      <ReceiptModal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        transaction={selectedTx}
        partnerName={user?.partner_name}
      />
    </div>
  );
};

export default Transactions;
