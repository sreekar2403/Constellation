import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center h-8 w-8 rounded-md bg-bg-tertiary/60 border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all active:scale-90"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <Moon size={14} strokeWidth={1.75} />
      ) : (
        <Sun size={14} strokeWidth={1.75} />
      )}
    </button>
  );
};
