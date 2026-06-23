import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useGraphStore } from '../store/useGraphStore';
import { useThemeStore } from '../store/useThemeStore';
import { Input } from './ui';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { setRootPath } = useWorkspaceStore();
  const { fetchGraph } = useGraphStore();
  const { toggleTheme } = useThemeStore();

  const commands: Command[] = [
    {
      id: 'change-workspace',
      label: 'Change Workspace',
      shortcut: '⌘W',
      action: () => {
        const path = prompt('Enter root folder path:');
        if (path) setRootPath(path);
      },
      category: 'Workspace',
    },
    {
      id: 'rebuild-graph',
      label: 'Rebuild Knowledge Graph',
      shortcut: '⌘R',
      action: () => {
        const root = localStorage.getItem('constellation-root-path');
        if (root) fetchGraph(root);
      },
      category: 'Graph',
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      shortcut: '⌘D',
      action: toggleTheme,
      category: 'Appearance',
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleSelect = useCallback(
    (command: Command) => {
      command.action();
      setIsOpen(false);
      setQuery('');
    },
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-overlay"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-md bg-bg-elevated rounded-xl shadow-lg overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-border-primary">
          <Input
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Commands */}
        <div className="max-h-64 overflow-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-4 text-center text-sm text-text-tertiary">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command) => (
              <button
                key={command.id}
                onClick={() => handleSelect(command)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-tertiary transition-colors text-left"
              >
                <div>
                  <div className="text-sm text-text-primary">{command.label}</div>
                  <div className="text-xs text-text-tertiary">{command.category}</div>
                </div>
                {command.shortcut && (
                  <span className="text-xs text-text-tertiary font-mono">
                    {command.shortcut}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border-primary text-xs text-text-tertiary">
          Press <kbd className="px-1 py-0.5 bg-bg-tertiary rounded">⌘K</kbd> to
          toggle, <kbd className="px-1 py-0.5 bg-bg-tertiary rounded">Esc</kbd>{' '}
          to close
        </div>
      </div>
    </div>
  );
};
