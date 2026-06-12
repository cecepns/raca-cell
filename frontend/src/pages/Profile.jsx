import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User, Mail, Phone, Wallet, Shield, LogOut, ChevronRight, Percent, MessageCircle, PlusCircle } from 'lucide-react';
import { get } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/request';

const roleLabels = { owner: 'Owner', admin: 'Admin', user: 'User' };

const Profile = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);

  useEffect(() => {
    get(API_ENDPOINTS.SETTINGS.CONTACT).then((res) => setContact(res.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
    navigate('/login');
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
