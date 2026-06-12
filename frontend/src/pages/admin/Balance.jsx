import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Minus, Wallet } from 'lucide-react';
import Header from '../../components/layout/Header';
import SearchInput from '../../components/ui/SearchInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { get, post, formatCurrency, formatDate, getErrorMessage } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';

const typeLabels = { topup: 'Topup', add: 'Tambah', reduce: 'Kurangi', purchase: 'Pembelian', refund: 'Refund' };
const typeColors = {
  topup: 'text-green-600',
  add: 'text-green-600',
  reduce: 'text-red-600',
  purchase: 'text-orange-600',
  refund: 'text-blue-600',
};

const USER_PAGE_LIMIT = 10;

const Balance = () => {
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [userPagination, setUserPagination] = useState({ page: 1, limit: USER_PAGE_LIMIT, total: 0, totalPages: 1 });
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ type: 'topup', amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('topup');

  const debouncedUserSearch = useDebounce(userSearch, 1000);
  const debouncedHistorySearch = useDebounce(historySearch);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await get(API_ENDPOINTS.USERS.LIST, {
        page: userPagination.page,
        limit: USER_PAGE_LIMIT,
        search: debouncedUserSearch,
        role: 'user',
      });
      setUsers(res.data);
      setUserPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await get(API_ENDPOINTS.BALANCE.HISTORY, {
        page: historyPagination.page,
        limit: historyPagination.limit,
        search: debouncedHistorySearch,
      });
      setHistory(res.data);
      setHistoryPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'topup') fetchUsers();
  }, [debouncedUserSearch, userPagination.page, tab]);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [debouncedHistorySearch, historyPagination.page, historyPagination.limit, tab]);

  useEffect(() => {
    setUserPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedUserSearch]);

  const openTopup = (user) => {
    setSelectedUser(user);
    setForm({ type: 'topup', amount: '', note: '' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }
    setSaving(true);
    try {
      await post(API_ENDPOINTS.USERS.BALANCE(selectedUser.id), form);
      toast.success('Saldo berhasil diperbarui');
      setModalOpen(false);
      fetchUsers();
      if (tab === 'history') fetchHistory();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="Manajemen Saldo" subtitle="Topup & kelola saldo user" />

      <div className="px-4 -mt-4 space-y-3">
        <div className="flex gap-2">
          {['topup', 'history'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                tab === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'topup' ? 'Topup Saldo' : 'Riwayat'}
            </button>
          ))}
        </div>

        {tab === 'topup' ? (
          <>
            <SearchInput
              value={userSearch}
              onChange={setUserSearch}
              placeholder="Cari user (nama, email, no. HP)..."
            />
            {usersLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : users.length === 0 ? (
              <EmptyState title="User tidak ditemukan" description="Coba kata kunci lain" />
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="bg-white border rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <p className="text-xs text-gray-400">{user.phone}</p>
                      <p className="text-sm font-bold text-primary-600 mt-1">{formatCurrency(user.balance)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setSelectedUser(user); setForm({ type: 'add', amount: '', note: '' }); setModalOpen(true); }}
                        className="p-2 bg-green-50 rounded-lg"
                      >
                        <Plus className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setForm({ type: 'reduce', amount: '', note: '' }); setModalOpen(true); }}
                        className="p-2 bg-red-50 rounded-lg"
                      >
                        <Minus className="w-4 h-4 text-red-600" />
                      </button>
                      <button
                        onClick={() => openTopup(user)}
                        className="px-3 py-2 bg-primary-600 text-white text-xs rounded-lg font-medium"
                      >
                        Topup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              pagination={userPagination}
              onPageChange={(page) => setUserPagination((p) => ({ ...p, page }))}
              showLimitSelect={false}
            />
          </>
        ) : (
          <>
            <SearchInput value={historySearch} onChange={setHistorySearch} placeholder="Cari riwayat..." />
            {historyLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : history.length === 0 ? (
              <EmptyState title="Belum ada riwayat" />
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.user_name}</p>
                        <p className={`text-sm font-bold ${typeColors[item.type]}`}>
                          {typeLabels[item.type]} {formatCurrency(item.amount)}
                        </p>
                      </div>
                      <Wallet className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>{formatCurrency(item.balance_before)} → {formatCurrency(item.balance_after)}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    {item.note && <p className="text-xs text-gray-500 mt-1">{item.note}</p>}
                  </div>
                ))}
              </div>
            )}
            <Pagination
              pagination={historyPagination}
              onPageChange={(page) => setHistoryPagination((p) => ({ ...p, page }))}
              onLimitChange={(limit) => setHistoryPagination((p) => ({ ...p, limit, page: 1 }))}
            />
          </>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${typeLabels[form.type]} - ${selectedUser?.name}`}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Saldo saat ini: <span className="font-bold text-primary-600">{formatCurrency(selectedUser?.balance)}</span>
          </p>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900"
          >
            <option value="topup">Topup</option>
            <option value="add">Tambah Saldo</option>
            <option value="reduce">Kurangi Saldo</option>
          </select>
          <input
            type="number"
            placeholder="Jumlah (Rp)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900"
          />
          <textarea
            placeholder="Catatan (opsional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl resize-none bg-white text-gray-900"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-60"
          >
            {saving ? 'Memproses...' : 'Simpan'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Balance;
