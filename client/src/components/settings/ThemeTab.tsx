import React from 'react';
import { useThemeStore } from '@/store/useThemeStore';

export const ThemeTab: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <input
                type="radio"
                id="theme-light"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="radio"
              />
            </div>
            <div>
              <label htmlFor="theme-light" className="cursor-pointer font-medium">
                Light
              </label>
              <p className="text-xs text-text-tertiary">
                Light background, dark text
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <input
                type="radio"
                id="theme-dark"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="radio"
              />
            </div>
            <div>
              <label htmlFor="theme-dark" className="cursor-pointer font-medium">
                Dark
              </label>
              <p className="text-xs text-text-tertiary">
                Dark background, light text (Observatory aesthetic)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <input
                type="radio"
                id="theme-auto"
                name="theme"
                value="auto"
                checked={theme === 'auto'}
                onChange={() => setTheme('auto')}
                className="radio"
              />
            </div>
            <div>
              <label htmlFor="theme-auto" className="cursor-pointer font-medium">
                Auto (System)
              </label>
              <p className="text-xs text-text-tertiary">
                Follows system preference
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Observatory Accent Colors</h2>
        <p className="text-text-tertiary">
          The Observatory aesthetic uses a cyan-to-violet gradient. Customization of accent colors
          is not yet implemented but will be available in a future update.
        </p>
      </div>
    </div>
  );
};