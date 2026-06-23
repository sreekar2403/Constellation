import React from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useThemeStore } from '../store/useThemeStore';
import { Button, Input } from './ui';

export const SettingsPanel: React.FC = () => {
  const { rootPath, setRootPath, clearRootPath, lastVisited } =
    useWorkspaceStore();
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
        <p className="text-sm text-text-secondary">
          Configure your Constellation workspace
        </p>
      </div>

      {/* Workspace Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-primary">Workspace</h3>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-tertiary">Root Folder</label>
          <div className="flex gap-2">
            <Input
              value={rootPath || ''}
              readOnly
              placeholder="No folder selected"
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const newPath = prompt('Enter new root folder path:');
                if (newPath) setRootPath(newPath);
              }}
            >
              Change
            </Button>
          </div>
        </div>

        {rootPath && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRootPath}
            className="self-start"
          >
            Clear Workspace
          </Button>
        )}
      </div>

      {/* Theme Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-primary">Appearance</h3>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-tertiary">Theme</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                theme === 'light'
                  ? 'border-accent-primary bg-accent-muted text-accent-primary'
                  : 'border-border-primary bg-bg-elevated text-text-secondary hover:border-border-secondary'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                theme === 'dark'
                  ? 'border-accent-primary bg-accent-muted text-accent-primary'
                  : 'border-border-primary bg-bg-elevated text-text-secondary hover:border-border-secondary'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Recent Paths */}
      {lastVisited.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-text-primary">
            Recent Folders
          </h3>
          <div className="space-y-1">
            {lastVisited.map((path, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-secondary"
              >
                <span className="text-sm text-text-secondary truncate">
                  {path}
                </span>
                <button
                  onClick={() => setRootPath(path)}
                  className="text-xs text-accent-primary hover:text-accent-secondary"
                >
                  Switch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="flex flex-col gap-3 pt-4 border-t border-border-primary">
        <h3 className="text-sm font-medium text-text-primary">About</h3>
        <div className="text-xs text-text-tertiary space-y-1">
          <p>Constellation v0.1.0</p>
          <p>Knowledge-Graph Command Centre</p>
        </div>
      </div>
    </div>
  );
};
