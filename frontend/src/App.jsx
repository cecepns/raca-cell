import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MobileLayout from './components/layout/MobileLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceProducts from './pages/ServiceProducts';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';
import BalanceHistory from './pages/BalanceHistory';
import Users from './pages/admin/Users';
import Balance from './pages/admin/Balance';
import ActivityLogs from './pages/admin/ActivityLogs';
import MarginSettings from './pages/admin/MarginSettings';
import TopupRequest from './pages/TopupRequest';
import AdminTopupRequests from './pages/admin/TopupRequests';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={
            <ProtectedRoute>
              <MobileLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/layanan" element={<Services />} />
          <Route path="/layanan/:serviceId" element={<ServiceProducts />} />
          <Route path="/pulsa" element={<Navigate to="/layanan" replace />} />
          <Route path="/riwayat" element={<Transactions />} />
          <Route path="/riwayat-saldo" element={<BalanceHistory />} />
          <Route path="/request-topup" element={<TopupRequest />} />
          <Route path="/profil" element={<Profile />} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/saldo"
            element={
              <ProtectedRoute adminOnly>
                <Balance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute adminOnly>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/margin"
            element={
              <ProtectedRoute adminOnly>
                <MarginSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/topup-requests"
            element={
              <ProtectedRoute adminOnly>
                <AdminTopupRequests />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
