import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'auto',
      setTheme: (theme: Theme) => {
        set((state) => {
          // Update attribute based on theme
          if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', theme);
          }
          return { theme };
        });
      },
      toggleTheme: () => {
        set((state) => {
          let newTheme: Theme = state.theme === 'light' ? 'dark' : 'light';
          if (state.theme === 'auto') {
            // If currently auto, switch to dark (could also be light; choose dark)
            newTheme = 'dark';
          }
          // Update attribute (newTheme is never 'auto')
          document.documentElement.setAttribute('data-theme', newTheme);
          return { theme: newTheme };
        });
      },
    }),
    {
      name: 'constellation-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          if (state.theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', state.theme);
          }
        }
      },
    }
  )
);