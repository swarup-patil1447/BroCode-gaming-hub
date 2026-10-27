import {
  User,
  Role,
  Station,
  Booking,
  FoodItem,
  PricingRule,
  NotificationItem,
  AuditLogItem,
} from '../types';
// Determine API base URL:
// - If VITE_API_URL is explicitly set (e.g., custom production backend URL), use it.
// - Otherwise, default to '/api'.
// In local dev and LAN, Vite proxy routes '/api' to backend (works on localhost, 127.0.0.1, and LAN IP).
// In production, relative '/api' works with reverse proxies, same-origin setups, or Netlify redirects.
const API_BASE_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ''
    ? import.meta.env.VITE_API_URL.trim()
    : '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...fetchOptions } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_token') : null;

  const headers = new Headers(customHeaders || {});

  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let fullUrl: string;
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://')) {
    fullUrl = cleanEndpoint;
  } else {
    fullUrl = `${cleanBase}${cleanEndpoint}`;
  }

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });
  } catch (err: any) {
    if (
      err.name === 'TypeError' ||
      (err.message && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed')))
    ) {
      const error = new Error('Cannot connect to the BroCode server. Please verify that the backend is running on port 5000.');
      (error as any).status = 0;
      throw error;
    }
    throw err;
  }

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  // Preserve notifications structure: { data: NotificationItem[], unreadCount: number }
  if (data && typeof data === 'object' && 'unreadCount' in data && 'data' in data) {
    return data as T;
  }

  // If payload contains 'data' property, unwrap it (standard backend response format)
  if (data && typeof data === 'object' && 'data' in data && data.data !== undefined) {
    return data.data as T;
  }

  return data as T;
}

export const api = {
  auth: {
    login: async (credentials: { employeeId: string; password: string; expectedRole?: Role }) => {
      return request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },

    getMe: async () => {
      return request<User>('/auth/me', {
        method: 'GET',
      });
    },

    changePassword: async (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword?: string;
    }) => {
      return request<{ message: string; token?: string; user?: User }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    employeeChangePassword: async (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword?: string;
    }) => {
      return request<{ message: string; token?: string; user?: User }>(
        '/auth/employee/change-password',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    },

    requestOTP: async (identifierOrData: string | { employeeIdOrMobile: string }) => {
      const employeeIdOrMobile =
        typeof identifierOrData === 'string'
          ? identifierOrData
          : identifierOrData.employeeIdOrMobile;

      return request<{ employeeId: string; mobileMasked: string; devOtp?: string }>(
        '/auth/forgot-password/request-otp',
        {
          method: 'POST',
          body: JSON.stringify({ employeeIdOrMobile }),
        }
      );
    },

    verifyOTPAndResetPassword: async (data: {
      employeeId: string;
      otp: string;
      newPassword: string;
    }) => {
      return request<{ message: string }>('/auth/forgot-password/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getDevSMSLogs: async () => {
      return request<any[]>('/auth/dev-sms-logs', {
        method: 'GET',
      });
    },
  },

  stations: {
    getAll: async () => {
      return request<Station[]>('/stations', {
        method: 'GET',
      });
    },

    updateStatus: async (id: number | string, status: string) => {
      return request<Station>(`/stations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  },

  bookings: {
    getAll: async (params?: {
      status?: string;
      date?: string;
      paymentStatus?: string;
      search?: string;
      limit?: number;
      page?: number;
    }) => {
      return request<Booking[]>('/bookings', {
        method: 'GET',
        params,
      });
    },

    getById: async (id: string) => {
      return request<Booking>(`/bookings/${id}`, {
        method: 'GET',
      });
    },

    create: async (bookingData: {
      customerName: string;
      customerMobile: string;
      stationIds: number[];
      controllerCount?: number;
      startTime: string;
      endTime: string;
      foodItems?: Array<{ foodItemId: string; quantity: number }>;
      discount?: number;
      notes?: string;
    }) => {
      return request<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
    },

    update: async (id: string, updateData: Partial<Booking> | any) => {
      return request<Booking>(`/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    },

    extend: async (id: string, minsOrData: number | { extendMinutes: number }) => {
      const extendMinutes =
        typeof minsOrData === 'number' ? minsOrData : minsOrData.extendMinutes;

      return request<Booking>(`/bookings/${id}/extend`, {
        method: 'POST',
        body: JSON.stringify({ extendMinutes }),
      });
    },

    cancel: async (id: string, reasonOrData?: string | { cancelReason: string }) => {
      const cancelReason =
        typeof reasonOrData === 'string'
          ? reasonOrData
          : reasonOrData?.cancelReason || 'Cancelled by staff';

      return request<Booking>(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancelReason }),
      });
    },

    addFood: async (
      id: string,
      items: Array<{ foodItemId: string; quantity: number }>
    ) => {
      return request<Booking>(`/bookings/${id}/food`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },

    checkAvailability: async (params: {
      stationIds: number[];
      startTime: string;
      endTime: string;
      excludeBookingId?: string;
    }) => {
      return request<{ available: boolean; conflictingStationIds: number[] }>(
        '/bookings/check-availability',
        {
          method: 'GET',
          params: {
            stationIds: params.stationIds.join(','),
            startTime: params.startTime,
            endTime: params.endTime,
            excludeBookingId: params.excludeBookingId,
          },
        }
      );
    },
  },

  pricing: {
    getAll: async () => {
      return request<PricingRule[]>('/pricing', {
        method: 'GET',
      });
    },

    update: async (data: { deviceType: string; controllerCount: number; hourlyRate: number }) => {
      return request<PricingRule>('/pricing', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  food: {
    getAll: async () => {
      return request<FoodItem[]>('/food', {
        method: 'GET',
      });
    },

    create: async (item: {
      name: string;
      category: string;
      price: number;
      isAvailable?: boolean;
    }) => {
      return request<FoodItem>('/food', {
        method: 'POST',
        body: JSON.stringify(item),
      });
    },

    update: async (id: string, updates: Partial<FoodItem>) => {
      return request<FoodItem>(`/food/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: string) => {
      return request<{ message: string }>(`/food/${id}`, {
        method: 'DELETE',
      });
    },
  },

  payments: {
    getAll: async (params?: any) => {
      return request<any[]>('/payments', {
        method: 'GET',
        params,
      });
    },

    record: async (paymentData: { bookingId: string; amount: number; paymentMethod: string }) => {
      return request<{ payment: any; booking: Booking }>('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    },
  },

  employees: {
    getAll: async () => {
      return request<User[]>('/employees', {
        method: 'GET',
      });
    },

    create: async (employeeData: {
      employeeId: string;
      name: string;
      mobile: string;
      temporaryPassword?: string;
    }) => {
      return request<User>('/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData),
      });
    },

    update: async (id: string, updates: Partial<User>) => {
      return request<User>(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    resetPassword: async (id: string, newPassword: string) => {
      return request<{ message: string }>(`/employees/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
    },

    delete: async (id: string) => {
      return request<{ message: string }>(`/employees/${id}`, {
        method: 'DELETE',
      });
    },
  },

  reports: {
    getDashboardSummary: async () => {
      return request<{
        todayRevenue: number;
        todayGamingSales: number;
        todayFoodSales: number;
        todayBookingsCount: number;
        activeSessions: number;
        availableStations: number;
        occupiedStations: number;
        totalStations: number;
        pendingPaymentsCount: number;
        pendingPaymentAmount: number;
        serverTime: string;
      }>('/reports/dashboard-summary', {
        method: 'GET',
      });
    },

    getReports: async (params?: { period?: string; startDate?: string; endDate?: string }) => {
      let startDate = params?.startDate;
      let endDate = params?.endDate;

      if (!startDate && params?.period) {
        const now = new Date();
        endDate = now.toISOString();

        if (params.period === 'today') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          startDate = start.toISOString();
        } else if (params.period === 'week') {
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (params.period === 'month') {
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (params.period === 'year') {
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      return request<{
        summary: any;
        paymentMethods: Record<string, number>;
        dailyBreakdown: Array<{
          date: string;
          revenue: number;
          gaming: number;
          food: number;
          bookings: number;
        }>;
        stationUsage: Array<{
          tableNumber: number;
          deviceType: string;
          bookingCount: number;
          totalMinutes: number;
          revenue: number;
        }>;
        employeeActivity: Array<{
          name: string;
          employeeId: string;
          bookingsCount: number;
          paymentsCollected: number;
        }>;
      }>('/reports', {
        method: 'GET',
        params: {
          period: params?.period,
          startDate,
          endDate,
        },
      });
    },
  },

  notifications: {
    getAll: async () => {
      return request<{ data: NotificationItem[]; unreadCount: number }>('/notifications', {
        method: 'GET',
      });
    },

    markRead: async (id: string) => {
      return request<{ message: string }>(`/notifications/${id}/read`, {
        method: 'PUT',
      });
    },

    markAllRead: async () => {
      return request<{ message: string }>('/notifications/read-all', {
        method: 'PUT',
      });
    },
  },

  auditLogs: {
    getAll: async (params?: { search?: string; action?: string; page?: number; limit?: number }) => {
      return request<AuditLogItem[]>('/audit-logs', {
        method: 'GET',
        params,
      });
    },
  },

  health: {
    check: async () => {
      return request<{ status: string; time: string; service: string }>('/health', {
        method: 'GET',
      });
    },
  },
};

export default api;
