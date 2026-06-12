import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, History, User, Users, Wallet, ScrollText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BottomNav = () => {
  const { isAdmin } = useAuth();

  const userNav = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/layanan', icon: LayoutGrid, label: 'Layanan' },
    { to: '/riwayat', icon: History, label: 'Riwayat' },
    { to: '/profil', icon: User, label: 'Profil' },
  ];

  const adminNav = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/saldo', icon: Wallet, label: 'Saldo' },
    { to: '/admin/logs', icon: ScrollText, label: 'Log' },
    { to: '/profil', icon: User, label: 'Profil' },
  ];

  const navItems = isAdmin ? adminNav : userNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
      <div className="max-w-mobile mx-auto flex items-center justify-around px-1 py-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-[56px] transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
