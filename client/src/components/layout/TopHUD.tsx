import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  Server,
  Sparkles,
  ListTodo,
  Brain,
  Settings as SettingsIcon,
  Search,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/kanban', label: 'Kanban', Icon: Kanban },
  { to: '/platforms', label: 'Platforms', Icon: Server },
  { to: '/genome', label: 'Genome', Icon: Sparkles },
  { to: '/tasks', label: 'Tasks', Icon: ListTodo },
  { to: '/skills', label: 'Skills', Icon: Brain },
];

export const TopHUD: React.FC = () => {
  const location = useLocation();
  const showSettings = location.pathname.startsWith('/settings');

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-xl px-4 shrink-0 z-10">
      <div className="flex items-center gap-6">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary to-accent-secondary rounded blur opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-6 w-6 rounded bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Sparkles size={14} strokeWidth={2.5} className="text-text-inverse" />
            </div>
          </div>
          <span className="text-base font-semibold tracking-tight text-text-primary">
            Constellation
          </span>
          <span className="hidden lg:inline text-[10px] uppercase tracking-[0.2em] font-medium text-text-tertiary font-mono">
            Agent OS
          </span>
        </NavLink>

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-bg-tertiary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
                }`
              }
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${
                isActive || showSettings
                  ? 'bg-bg-tertiary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
              }`
            }
          >
            <SettingsIcon size={13} strokeWidth={1.75} />
            <span>Settings</span>
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Command palette hint */}
        <kbd className="hidden md:flex items-center gap-1 px-2 h-6 rounded-md bg-bg-tertiary/60 border border-border-primary text-[10px] text-text-tertiary font-mono">
          <Search size={10} strokeWidth={2} />
          <span>⌘</span>
          <span>K</span>
        </kbd>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar — CEO */}
        <div
          className="h-7 w-7 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-[10px] font-bold text-text-inverse cursor-pointer hover:shadow-glow-cyan transition-shadow"
          title="CEO"
        >
          CEO
        </div>
      </div>
    </header>
  );
};
