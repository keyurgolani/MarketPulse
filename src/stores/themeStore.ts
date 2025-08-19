import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Helper function to get system theme
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// Helper function to resolve theme
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

// Helper function to apply theme to document
const applyTheme = (resolvedTheme: 'light' | 'dark'): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#1f2937' : '#ffffff'
    );
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),

      setTheme: (theme: Theme): void => {
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },

      toggleTheme: (): void => {
        const { theme, resolvedTheme } = get();
        if (theme === 'system') {
          // If currently system, toggle to opposite of current resolved theme
          const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
          get().setTheme(newTheme);
        } else {
          // If currently light or dark, toggle to opposite
          const newTheme = theme === 'light' ? 'dark' : 'light';
          get().setTheme(newTheme);
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage:
        () =>
        (state): void => {
          if (state) {
            // Re-apply theme after hydration
            const resolvedTheme = resolveTheme(state.theme);
            state.resolvedTheme = resolvedTheme;
            applyTheme(resolvedTheme);
          }
        },
    }
  )
);

// Initialize theme on module load
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  applyTheme(store.resolvedTheme);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = (): void => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') {
      setTheme('system'); // This will re-resolve and apply the theme
    }
  };

  mediaQuery.addEventListener('change', handleSystemThemeChange);
}
