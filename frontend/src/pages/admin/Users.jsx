import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import Header from '../../components/layout/Header';
import SearchInput from '../../components/ui/SearchInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { get, post, put, del, formatCurrency, formatDate, getErrorMessage } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';

const Users = () => {
  const { isOwner } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'user', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const debouncedSearch = useDebounce(search);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.USERS.LIST, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        role: roleFilter,
      });
      setUsers(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, roleFilter, pagination.page, pagination.limit]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', email: '', phone: '', password: '', role: 'user', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, phone: user.phone, password: '', role: user.role, status: user.status });
    setModalOpen(true);
  };

  const openResetPassword = (user) => {
    setResetTargetUser(user);
    setResetPassword('');
    setResetPasswordModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      toast.error('Nama dan phone wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editUser) {
        await put(API_ENDPOINTS.USERS.DETAIL(editUser.id), {
          name: form.name,
          phone: form.phone,
          role: form.role,
          status: form.status,
        });
        toast.success('User berhasil diperbarui');
      } else {
        if (!form.email || !form.password) {
          toast.error('Email dan password wajib diisi');
          return;
        }
        await post(API_ENDPOINTS.USERS.LIST, form);
        toast.success('User berhasil dibuat');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Hapus user ${user.name}?`)) return;
    try {
      await del(API_ENDPOINTS.USERS.DETAIL(user.id));
      toast.success('User berhasil dihapus');
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const roleColors = { owner: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700', user: 'bg-gray-100 text-gray-700' };

  return (
    <div>
      <Header
        title="Manajemen Users"
        subtitle="Kelola pengguna aplikasi"
        right={
          <button onClick={openCreate} className="bg-white/20 p-2 rounded-xl">
            <Plus className="w-5 h-5 text-white" />
          </button>
        }
      />

      <div className="px-4 -mt-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari user..." />

        <div className="flex gap-2 overflow-x-auto">
          {['', 'user', 'admin', 'owner'].map((r) => (
            <button
              key={r || 'all'}
              onClick={() => { setRoleFilter(r); setPagination((p) => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                roleFilter === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Semua'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : users.length === 0 ? (
          <EmptyState title="Tidak ada user" />
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.phone}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-sm font-bold text-primary-600">{formatCurrency(user.balance)}</p>
                    <p className="text-xs text-gray-400">{formatDate(user.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(user)} className="p-2 bg-gray-100 rounded-lg">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    {(isOwner || user.role !== 'owner') && (
                      <button onClick={() => openResetPassword(user)} className="p-2 bg-blue-50 rounded-lg">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                    {isOwner && user.role !== 'owner' && (
                      <button onClick={() => handleDelete(user)} className="p-2 bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Tambah User'}>
        <div className="space-y-3">
          <input
            placeholder="Nama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl"
          />
          {!editUser && (
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl"
            />
          )}
          <input
            placeholder="No. HP"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl"
          />
          {!editUser && (
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl"
            />
          )}
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl bg-white"
            disabled={editUser?.role === 'owner'}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl bg-white"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => !resetSaving && setResetPasswordModalOpen(false)}
        title="Reset Password User"
      >
        <div className="space-y-3">
          {resetTargetUser && (
            <div className="text-sm text-gray-700">
              Atur ulang password untuk{' '}
              <span className="font-semibold">
                {resetTargetUser.name} ({resetTargetUser.email || resetTargetUser.phone})
              </span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password Baru</label>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!resetTargetUser) return;
              if (!resetPassword) {
                toast.error('Password baru wajib diisi');
                return;
              }
              if (resetPassword.length < 6) {
                toast.error('Password baru minimal 6 karakter');
                return;
              }
              setResetSaving(true);
              try {
                await post(API_ENDPOINTS.USERS.RESET_PASSWORD(resetTargetUser.id), { password: resetPassword });
                toast.success('Password user berhasil direset');
                setResetPasswordModalOpen(false);
              } catch (err) {
                toast.error(getErrorMessage(err));
              } finally {
                setResetSaving(false);
              }
            }}
            disabled={resetSaving}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-60"
          >
            {resetSaving ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
