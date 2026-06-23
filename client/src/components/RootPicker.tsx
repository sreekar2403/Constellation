import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { Button, Input } from './ui';

interface RootPickerProps {
  onSelect: (path: string) => void;
}

export const RootPicker: React.FC<RootPickerProps> = ({ onSelect }) => {
  const { lastVisited, setRootPath } = useWorkspaceStore();
  const [customPath, setCustomPath] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelectPath = async (path: string) => {
    setError(null);

    try {
      // Verify path exists
      const response = await fetch(
        `/api/files/list?path=${encodeURIComponent(path)}`
      );
      if (!response.ok) {
        throw new Error('Invalid path');
      }

      setRootPath(path);
      onSelect(path);
    } catch (err) {
      setError('Path does not exist or is not accessible');
    }
  };

  const handleCustomPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim()) {
      handleSelectPath(customPath.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-accent-primary text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Welcome to Constellation
          </h1>
          <p className="text-text-secondary">
            Select a root folder to build your knowledge graph
          </p>
        </div>

        {/* Custom Path Input */}
        <form onSubmit={handleCustomPathSubmit} className="mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter folder path..."
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              wrapperClassName="flex-1"
            />
            <Button type="submit" variant="primary" className="shrink-0">
              Go
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-status-error">{error}</p>
          )}
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border-primary" />
          <span className="text-xs text-text-tertiary">or choose recent</span>
          <div className="flex-1 h-px bg-border-primary" />
        </div>

        {/* Recent Paths */}
        {lastVisited.length > 0 && (
          <div className="space-y-2">
            {lastVisited.map((path, index) => (
              <button
                key={index}
                onClick={() => handleSelectPath(path)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border-primary bg-bg-elevated shadow-sm hover:border-accent-primary hover:bg-accent-muted hover:shadow-md transition-all duration-150 active:scale-[0.99]"
              >
                <div className="text-sm font-medium text-text-primary truncate">
                  {path.split(/[/\\]/).pop()}
                </div>
                <div className="text-xs text-text-tertiary truncate mt-1">
                  {path}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {lastVisited.length === 0 && (
          <div className="text-center py-8 text-text-tertiary text-sm">
            No recent folders. Enter a path above to get started.
          </div>
        )}
      </div>
    </div>
  );
};
