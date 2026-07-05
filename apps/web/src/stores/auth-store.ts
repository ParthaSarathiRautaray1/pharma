import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/api';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string | null;
  pharmacyName: string | null;
}

interface AuthState {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: {
    user: SessionUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (session) => set(session),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'pharmacare-auth' },
  ),
);
