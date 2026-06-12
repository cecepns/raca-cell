import { api } from './api';

export const get = async (url, params = {}) => {
  const response = await api.get(url, { params });
  return response.data;
};

export const post = async (url, data = {}) => {
  const response = await api.post(url, data);
  return response.data;
};

export const put = async (url, data = {}) => {
  const response = await api.put(url, data);
  return response.data;
};

export const del = async (url) => {
  const response = await api.delete(url);
  return response.data;
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

export const formatDate = (date) =>
  new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Terjadi kesalahan';
