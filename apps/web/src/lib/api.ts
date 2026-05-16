import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import Cookies from 'js-cookie';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY ?? 'aierp_access_token';
const REFRESH_TOKEN_KEY =
  process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY ?? 'aierp_refresh_token';
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : '/api/v1';

// ─── Server response wrapper (from TransformInterceptor) ─────────────────────
interface ServerResponse<T = any> {
  data: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
    statusCode: number;
    itemCount?: number;
    pageCount?: number;
    currentPage?: number;
  };
}

// ─── Token helpers ────────────────────────────────────────────────────────────
export const tokenStorage = {
  getAccess: (): string | null =>
    Cookies.get(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: (): string | null =>
    Cookies.get(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY),
  getTenantId: (): string | null => localStorage.getItem('aierp_tenant_id'),

  setAccess: (token: string) => {
    Cookies.set(ACCESS_TOKEN_KEY, token, { secure: true, sameSite: 'strict' });
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  setRefresh: (token: string) => {
    Cookies.set(REFRESH_TOKEN_KEY, token, {
      secure: true,
      sameSite: 'strict',
      expires: 30,
    });
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  setTenantId: (id: string) => localStorage.setItem('aierp_tenant_id', id),

  clear: () => {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('aierp_tenant_id');
    localStorage.removeItem('aierp_user');
  },
};

// ─── Axios instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptors ─────────────────────────────────────────────────────

// 1. Attach JWT access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Attach X-Tenant-ID header
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tenantId = tokenStorage.getTenantId();
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

// ─── Response interceptors ────────────────────────────────────────────────────

// Track whether a refresh is already in-flight to avoid loops
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// 3. Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            };
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStorage.getRefresh();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });

        // Unwrap server envelope if present
        const payload = data?.data ?? data;
        const newAccessToken: string = payload.accessToken;
        tokenStorage.setAccess(newAccessToken);
        if (payload.refreshToken) tokenStorage.setRefresh(payload.refreshToken);

        onTokenRefreshed(newAccessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return api(originalRequest);
      } catch {
        tokenStorage.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // ─── Normalise error response ─────────────────────────────────────────
    const status = error.response?.status;
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const message =
      (responseData?.message as string) ??
      (responseData?.error as string) ??
      error.message ??
      'An unexpected error occurred';

    return Promise.reject({
      status,
      message,
      errors: (responseData?.errors as Record<string, string[]>) ?? null,
      raw: error,
    });
  },
);

// ─── Unwrap helper ────────────────────────────────────────────────────────────
// The NestJS TransformInterceptor wraps every response in { data, meta }.
// This helper safely unwraps so callers get the payload directly.
function unwrap<T>(body: any): T {
  if (body && typeof body === 'object' && 'data' in body && 'meta' in body) {
    return body.data as T;
  }
  return body as T;
}

// ─── Typed API helpers ────────────────────────────────────────────────────────
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<ServerResponse<T>>(url, { params });
  return unwrap<T>(data);
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ServerResponse<T>>(url, body);
  return unwrap<T>(data);
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<ServerResponse<T>>(url, body);
  return unwrap<T>(data);
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ServerResponse<T>>(url, body);
  return unwrap<T>(data);
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await api.delete<ServerResponse<T>>(url);
  return unwrap<T>(data);
}

export default api;
