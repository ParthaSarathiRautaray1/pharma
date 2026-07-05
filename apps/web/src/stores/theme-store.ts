import { create } from 'zustand';

type Theme = 'light' | 'dark';

// Key must match the pre-paint script in index.html
const STORAGE_KEY = 'pharmacare-theme';

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
