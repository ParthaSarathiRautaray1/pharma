import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@/types/api';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Single-flight refresh ────────────────────────────────────────────
// Many requests can 401 at once when the access token expires; only one
// refresh call is made and the rest wait on the same promise.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) throw new Error('No refresh token');

  try {
    // Raw axios: must not recurse through this interceptor
    const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
    setSession(data.data);
    return data.data.accessToken as string;
  } catch (err) {
    clearSession();
    window.location.assign('/auth/login');
    throw err;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const code = error.response?.data?.error?.code;

    const shouldRefresh =
      error.response?.status === 401 &&
      (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED') &&
      !!useAuthStore.getState().refreshToken &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/');

    if (shouldRefresh) {
      original._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }

    return Promise.reject(error);
  },
);

/** Extracts the API error message for toasts/forms. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }
  return fallback;
}
