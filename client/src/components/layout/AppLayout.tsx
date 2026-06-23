import React, { useState } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { useThemeStore } from '../../store/useThemeStore';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebar,
  rightPanel,
}) => {
  const { theme } = useThemeStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full bg-bg-primary">
      {/* Sidebar */}
      {sidebar && (
        <aside
          className={`flex flex-col border-r border-border-primary bg-bg-secondary shadow-sm transition-all duration-300 ${
            sidebarCollapsed ? 'w-12' : 'w-64'
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-12 px-3 border-b border-border-primary">
            {!sidebarCollapsed && (
              <span className="text-sm font-medium text-text-primary">
                Explorer
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-bg-tertiary hover:shadow-sm transition-all duration-150 active:scale-90"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-text-secondary transition-transform duration-200 ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Sidebar Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-auto p-2">{sidebar}</div>
          )}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-12 px-4 border-b border-border-primary bg-bg-secondary">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              Constellation
            </span>
            <span className="text-xs text-text-tertiary">Command Centre</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Main View */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>

      {/* Right Panel */}
      {rightPanel && (
        <aside
          className={`flex flex-col border-l border-border-primary bg-bg-secondary shadow-sm transition-all duration-300 ${
            rightPanelCollapsed ? 'w-12' : 'w-80'
          }`}
        >
          {/* Right Panel Header */}
          <div className="flex items-center justify-between h-12 px-3 border-b border-border-primary">
            {!rightPanelCollapsed && (
              <span className="text-sm font-medium text-text-primary">
                Details
              </span>
            )}
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-bg-tertiary hover:shadow-sm transition-all duration-150 active:scale-90"
              aria-label={rightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-text-secondary transition-transform duration-200 ${
                  rightPanelCollapsed ? 'rotate-180' : ''
                }`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Right Panel Content */}
          {!rightPanelCollapsed && (
            <div className="flex-1 overflow-auto p-3">{rightPanel}</div>
          )}
        </aside>
      )}
    </div>
  );
};
