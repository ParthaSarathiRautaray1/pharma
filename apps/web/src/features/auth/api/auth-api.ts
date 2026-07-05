import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore, type SessionUser } from '@/stores/auth-store';
import type { ApiSuccess } from '@/types/api';

interface SessionPayload {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post<ApiSuccess<SessionPayload>>('/auth/login', input);
      return data.data;
    },
    onSuccess: setSession,
  });
}

export function useLogout() {
  const { refreshToken, clearSession } = useAuthStore.getState();
  return useMutation({
    mutationFn: async () => {
      if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    },
    onSettled: () => clearSession(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: { email: string }) => {
      await api.post('/auth/forgot-password', input);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      await api.post('/auth/reset-password', input);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      await api.post('/auth/change-password', input);
    },
  });
}
