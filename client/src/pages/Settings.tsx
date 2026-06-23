import React, { useState } from 'react';
import {
  FolderOpen,
  Palette,
  Server,
  Workflow,
  Brain,
  Info,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { WorkspaceTab } from '@/components/settings/WorkspaceTab';
import { ThemeTab } from '@/components/settings/ThemeTab';
import { ProvidersTab } from '@/components/settings/ProvidersTab';
import { DispatcherTab } from '@/components/settings/DispatcherTab';
import { SkillsTab } from '@/components/settings/SkillsTab';
import { AboutTab } from '@/components/settings/AboutTab';

const SETTINGS_TABS = [
  { id: 'workspace', label: 'Workspace', Icon: FolderOpen, Component: WorkspaceTab },
  { id: 'theme', label: 'Theme', Icon: Palette, Component: ThemeTab },
  { id: 'providers', label: 'Providers', Icon: Server, Component: ProvidersTab },
  { id: 'dispatcher', label: 'Dispatcher', Icon: Workflow, Component: DispatcherTab },
  { id: 'skills', label: 'Skills', Icon: Brain, Component: SkillsTab },
  { id: 'about', label: 'About', Icon: Info, Component: AboutTab },
];

export const Settings: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'workspace' | 'theme' | 'providers' | 'dispatcher' | 'skills' | 'about'>('workspace');
  const TabComponent = SETTINGS_TABS.find(tab => tab.id === selectedTab)?.Component;

  return (
    <PageShell
      title="Settings"
      subtitle="Workspace · Theme · Providers · Dispatcher · Skills · About"
    >
      <div className="flex h-full">
        {/* Tab sidebar */}
        <nav className="w-56 shrink-0 border-r border-border-primary p-3">
          <div className="space-y-0.5">
            {SETTINGS_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedTab(id as any)}
                className={`w-full flex items-center gap-2 px-3 h-9 rounded-md ${
                  selectedTab === id
                    ? 'bg-accent-secondary/20 text-accent-secondary'
                    : 'text-text-secondary hover:bg-bg-secondary/50'
                } transition-colors`}
              >
                <Icon size={14} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {TabComponent ? <TabComponent /> : <div className="text-center py-8">Loading...</div>}
        </div>
      </div>
    </PageShell>
  );
};