import { API_BASE_URL } from './config';

export { API_BASE_URL };

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id) => `/users/${id}`,
    BALANCE: (id) => `/users/${id}/balance`,
  },
  BALANCE: {
    HISTORY: '/balance/history',
  },
  PRODUCTS: {
    PREPAID: '/products/prepaid',
    BRANDS: '/products/brands',
    CATEGORIES: '/products/categories',
    SERVICES: '/products/services',
    REFRESH_CACHE: '/products/refresh-cache',
  },
  TRANSACTIONS: {
    LIST: '/transactions',
    DETAIL: (id) => `/transactions/${id}`,
    TOPUP: '/transactions/topup',
  },
  ACTIVITY_LOGS: {
    LIST: '/activity-logs',
  },
  DASHBOARD: {
    STATS: '/dashboard/stats',
  },
  SETTINGS: {
    MARGIN: '/settings/margin',
    CONTACT: '/settings/contact',
    WHATSAPP: '/settings/whatsapp',
  },
  TOPUP_REQUESTS: {
    LIST: '/topup-requests',
    APPROVE: (id) => `/topup-requests/${id}/approve`,
    REJECT: (id) => `/topup-requests/${id}/reject`,
  },
};
