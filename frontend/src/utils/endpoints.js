import { API_BASE_URL } from './config';

export { API_BASE_URL };

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id) => `/users/${id}`,
    BALANCE: (id) => `/users/${id}/balance`,
    RESET_PASSWORD: (id) => `/users/${id}/reset-password`,
  },
  BALANCE: {
    HISTORY: '/balance/history',
  },
  PRODUCTS: {
    PREPAID: '/products/prepaid',
    PASCA: '/products/pasca',
    BRANDS: '/products/brands',
    CATEGORIES: '/products/categories',
    SERVICES: '/products/services',
    REFRESH_CACHE: '/products/refresh-cache',
    MARGINS: {
      LIST: '/products/margins',
      SET: (sku) => `/products/margins/${encodeURIComponent(sku)}`,
    },
  },
  TRANSACTIONS: {
    LIST: '/transactions',
    DETAIL: (id) => `/transactions/${id}`,
    TOPUP: '/transactions/topup',
    PASCA_INQUIRY: '/transactions/pasca/inquiry',
    PASCA_PAY: '/transactions/pasca/pay',
    CHECK_STATUS: (id) => `/transactions/${id}/check-status`,
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
