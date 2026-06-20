import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User, Mail, Phone, Wallet, Shield, LogOut, ChevronRight, Percent, MessageCircle, PlusCircle, Store, Save, KeyRound } from 'lucide-react';
import { get, post, getErrorMessage } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/request';
import Modal from '../components/ui/Modal';

const roleLabels = { owner: 'Owner', admin: 'Admin', user: 'User' };

const Profile = () => {
  const { user, logout, isAdmin, updatePartnerName } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [partnerName, setPartnerName] = useState(user?.partner_name || '');
  const [savingPartner, setSavingPartner] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    get(API_ENDPOINTS.SETTINGS.CONTACT).then((res) => setContact(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPartnerName(user?.partner_name || '');
  }, [user?.partner_name]);

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  const handleSavePartnerName = async () => {
    setSavingPartner(true);
    try {
      await updatePartnerName(partnerName.trim());
      toast.success('Nama mitra berhasil disimpan');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan nama mitra');
    } finally {
      setSavingPartner(false);
    }
  };

  const handleOpenChangePassword = () => {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setPasswordModalOpen(true);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Semua field password wajib diisi');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setChangingPassword(true);
    try {
      await post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password berhasil diganti');
      setPasswordModalOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const menuItems = [
    ...(isAdmin ? [
      { icon: Shield, label: 'Panel Admin', to: '/admin/users' },
      { icon: Percent, label: 'Pengaturan Aplikasi', to: '/admin/margin' },
      { icon: PlusCircle, label: 'Request Topup User', to: '/admin/topup-requests' },
    ] : [
      { icon: PlusCircle, label: 'Request Topup Saldo', to: '/request-topup' },
    ]),
    { icon: Wallet, label: 'Riwayat Saldo', to: '/riwayat-saldo' },
    { icon: ChevronRight, label: 'Riwayat Transaksi', to: '/riwayat' },
  ];

  return (
    <div>
      <Header title="Profil" subtitle="Informasi akun Anda" />

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{user?.name}</h2>
              <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium mt-1">
                {roleLabels[user?.role]}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={user?.email} />
            <InfoRow icon={Phone} label="No. HP" value={user?.phone} />
            <InfoRow icon={Wallet} label="Saldo" value={formatCurrency(user?.balance)} highlight />
          </div>

          <button
            type="button"
            onClick={handleOpenChangePassword}
            className="mt-4 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-primary-100 rounded-xl text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100"
          >
            <KeyRound className="w-4 h-4" />
            Ganti Password
          </button>
        </div>

        <div className="bg-white rounded-2xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Nama Mitra</h3>
              <p className="text-xs text-gray-500">Muncul di struk transaksi & saat dibagikan</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Contoh: Toko Jaya Cell"
              maxLength={100}
              className="flex-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleSavePartnerName}
              disabled={savingPartner}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingPartner ? '...' : 'Simpan'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">
          {menuItems.map(({ icon: Icon, label, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 border-b last:border-b-0 text-left"
            >
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>

        {!isAdmin && contact?.whatsapp_url && (
          <a
            href={contact.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600"
          >
            <MessageCircle className="w-5 h-5" />
            Hubungi Admin via WhatsApp
          </a>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-medium hover:bg-red-100"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>

      <Modal
        isOpen={passwordModalOpen}
        onClose={() => !changingPassword && setPasswordModalOpen(false)}
        title="Ganti Password"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password Saat Ini</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Masukkan password saat ini"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password Baru</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ulangi password baru"
            />
          </div>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-60"
          >
            {changingPassword ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, highlight }) => (
  <div className="flex items-center gap-3">
    <Icon className="w-4 h-4 text-gray-400" />
    <div className="flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm ${highlight ? 'font-bold text-primary-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  </div>
);

export default Profile;
