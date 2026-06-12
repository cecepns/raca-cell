import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { get, post } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = user && ['owner', 'admin'].includes(user.role);
  const isOwner = user?.role === 'owner';

  const refreshProfile = useCallback(async () => {
    try {
      const res = await get(API_ENDPOINTS.AUTH.PROFILE);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return res.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshProfile]);

  const login = async (email, password) => {
    const res = await post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.data));
    setUser(res.data);
    return res;
  };

  const register = async (data) => {
    const res = await post(API_ENDPOINTS.AUTH.REGISTER, data);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.data));
    setUser(res.data);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateBalance = (balance) => {
    setUser((prev) => {
      const updated = { ...prev, balance };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, isOwner, login, register, logout, refreshProfile, updateBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
