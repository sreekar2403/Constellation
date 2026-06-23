import React from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  sidePanel?: React.ReactNode;
}

/**
 * PageShell — wraps non-Dashboard pages with header + main content + optional side panel.
 * Dashboard uses its own bespoke layout.
 */
export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  action,
  children,
  sidePanel,
}) => {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary bg-bg-secondary/40 shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>

      {/* Optional side panel */}
      {sidePanel && (
        <aside className="w-[360px] shrink-0 border-l border-border-primary bg-bg-secondary/60 backdrop-blur-xl overflow-auto">
          {sidePanel}
        </aside>
      )}
    </div>
  );
};
