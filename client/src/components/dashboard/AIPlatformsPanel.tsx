import React, { useEffect, useMemo, useState } from 'react';
import {
  Plug,
  Terminal,
  Globe,
  Server,
  Plus,
  Bot,
  Circle,
  BookOpen,
  Mail,
  Music,
  Calendar,
  X,
} from 'lucide-react';
import { useProviderStore } from '../../store/useProviderStore';
import { useAgentStore } from '../../store/useAgentStore';
import { useTaskStore } from '../../store/useTaskStore';
import type { ProviderHealth } from '@constellation/shared';

type ProviderChip = {
  id: string;
  displayName: string;
  icon: string;
  brandColor: string;
  type: string;
};

const PROVIDER_META: Record<string, ProviderChip> = {
  ollama: {
    id: 'ollama',
    displayName: 'Ollama',
    icon: 'Globe',
    brandColor: '#16a34a',
    type: 'Local HTTP',
  },
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    icon: 'Bot',
    brandColor: '#d97706',
    type: 'CLI PTY',
  },
  hermes: {
    id: 'hermes',
    displayName: 'Hermes',
    icon: 'Bot',
    brandColor: '#7c3aed',
    type: 'CLI PTY',
  },
  'gemini-cli': {
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    icon: 'Globe',
    brandColor: '#2563eb',
    type: 'CLI PTY',
  },
  opencode: {
    id: 'opencode',
    displayName: 'OpenCode',
    icon: 'Terminal',
    brandColor: '#0891b2',
    type: 'CLI PTY',
  },
  kimi: {
    id: 'kimi',
    displayName: 'Kimi CLI',
    icon: 'Terminal',
    brandColor: '#6366f1',
    type: 'CLI PTY',
  },
  pi: {
    id: 'pi',
    displayName: 'Pi AI',
    icon: 'Terminal',
    brandColor: '#db2777',
    type: 'CLI PTY',
  },
  notion: {
    id: 'notion',
    displayName: 'Notion',
    icon: 'BookOpen',
    brandColor: '#000000',
    type: 'Local HTTP',
  },
  spotify: {
    id: 'spotify',
    displayName: 'Spotify',
    icon: 'Music',
    brandColor: '#1DB954',
    type: 'Local HTTP',
  },
  gmail: {
    id: 'gmail',
    displayName: 'Gmail',
    icon: 'Mail',
    brandColor: '#EA4335',
    type: 'Local HTTP',
  },
  calendar: {
    id: 'calendar',
    displayName: 'Calendar',
    icon: 'Calendar',
    brandColor: '#4285F4',
    type: 'Local HTTP',
  },
};

const TYPE_ICON: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
> = {
  'Local HTTP': Globe,
  'CLI PTY': Terminal,
  'ACP server': Server,
};

function LiveDot({ status }: { status: ProviderHealth }) {
  return (
    <Circle
      size={6}
      fill={status === 'live' ? '#22c55e' : status === 'idle' ? '#f59e0b' : '#6b7280'}
      className="shrink-0"
    />
  );
}

function ProviderChip({
  chip,
  status,
  onClick,
}: {
  chip: ProviderChip;
  status: ProviderHealth;
  onClick: () => void;
}) {
  const Icon = TYPE_ICON[chip.type] ?? Bot;
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border border-white/6 bg-white/3 hover:bg-white/6 transition-colors cursor-pointer`}
    >
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0`}
        style={{ backgroundColor: chip.brandColor + '22', border: `1px solid ${chip.brandColor}44` }}
      >
        <span style={{ color: chip.brandColor }}>
          <Icon size={13} strokeWidth={2} className="shrink-0" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white/90 truncate leading-tight">
          {chip.displayName}
        </div>
      </div>
      <LiveDot status={status} />
    </div>
  );
}

export function AIPlatformsPanel() {
  const { providers, loading, hydrate } = useProviderStore();
  const agentCount = useAgentStore((s) => s.getAgentArray().length);
  const taskCount = useTaskStore((s) => (s.tasks ? Object.keys(s.tasks).length : 0));
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const liveProviders = useMemo(
    () => Object.values(providers).filter((p) => p.healthStatus === 'live'),
    [providers]
  );
  const idleProviders = useMemo(
    () => Object.values(providers).filter((p) => p.healthStatus === 'idle'),
    [providers]
  );
  const offlineProviders = useMemo(
    () => Object.values(providers).filter((p) => p.healthStatus === 'offline'),
    [providers]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold tracking-widest uppercase text-white/60">
            AI Platforms
          </h3>
          <p className="text-xs text-white/30 mt-0.5">
            {liveProviders.length}/{Object.keys(PROVIDER_META).length} live
            {agentCount > 0 && ` · ${agentCount} agents`}
            {taskCount > 0 && ` · ${taskCount} tasks`}
          </p>
        </div>
        <Plug size={14} className="text-white/30" />
      </div>

      {/* Live */}
      {liveProviders.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-emerald-400/70 mb-1.5 px-1">
            Live
          </div>
          <div className="flex flex-col gap-1">
            {liveProviders.map((p) => {
              const meta = PROVIDER_META[p.id] ?? {
                displayName: p.id,
                icon: 'Bot',
                brandColor: '#6b7280',
                type: 'CLI PTY',
              };
              return (
                <ProviderChip
                  key={p.id}
                  chip={{ ...meta, id: p.id }}
                  status={p.healthStatus}
                  onClick={() => setSelectedProvider(p.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Idle */}
      {idleProviders.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-amber-400/70 mb-1.5 px-1">
            Idle
          </div>
          <div className="flex flex-col gap-1">
            {idleProviders.map((p) => {
              const meta = PROVIDER_META[p.id] ?? {
                displayName: p.id,
                icon: 'Bot',
                brandColor: '#6b7280',
                type: 'CLI PTY',
              };
              return (
                <ProviderChip
                  key={p.id}
                  chip={{ ...meta, id: p.id }}
                  status={p.healthStatus}
                  onClick={() => setSelectedProvider(p.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Offline */}
      {offlineProviders.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5 px-1">
            Offline
          </div>
          <div className="flex flex-col gap-1">
            {offlineProviders.map((p) => {
              const meta = PROVIDER_META[p.id] ?? {
                displayName: p.id,
                icon: 'Bot',
                brandColor: '#6b7280',
                type: 'CLI PTY',
              };
              return (
                <ProviderChip
                  key={p.id}
                  chip={{ ...meta, id: p.id }}
                  status={p.healthStatus}
                  onClick={() => setSelectedProvider(p.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Known but not yet registered */}
      {Object.values(providers).length < Object.keys(PROVIDER_META).length && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-white/20 mb-1.5 px-1">
            Not connected
          </div>
          <div className="flex flex-col gap-1">
            {Object.values(PROVIDER_META)
              .filter((m) => !providers[m.id])
              .map((chip) => (
                <ProviderChip
                  key={chip.id}
                  chip={chip}
                  status="offline"
                  onClick={() => setSelectedProvider(chip.id)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Connect button */}
      <button
        className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-2.5 text-xs font-medium text-white/40 hover:border-white/40 hover:text-white/70 hover:bg-white/4 transition-all"
        title="Connect a new platform via /connect command"
      >
        <Plus size={13} />
        Connect Platform
      </button>

      {/* Provider Chat Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-bg-elevated rounded-xl border border-border-primary shadow-lg">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary/50 border-b border-border-primary">
                <h2 className="text-lg font-semibold text-text-primary">
                  Chat with {PROVIDER_META[selectedProvider]?.displayName ?? selectedProvider}
                </h2>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="p-1 rounded hover:bg-bg-tertiary/60"
                  aria-label="Close chat"
                >
                  <X size={14} strokeWidth={1.5} className="text-text-tertiary hover:text-text-primary" />
                </button>
              </div>
              {/* Messages placeholder */}
              <div className="flex-1 p-4 overflow-y-auto bg-bg-primary/50">
                <div className="text-center py-8 text-text-tertiary">
                  Chat interface coming soon...
                  <br />
                  <span className="block text-xs mt-2">
                    This feature will allow you to interact directly with the{' '}
                    {PROVIDER_META[selectedProvider]?.displayName ?? selectedProvider} agent.
                  </span>
                </div>
              </div>
              {/* Input placeholder */}
              <div className="px-4 py-3 bg-bg-secondary/50 border-t border-border-primary">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded border border-border-primary bg-bg-tertiary/70 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    disabled
                  />
                  <button
                    disabled
                    className="px-3 py-2 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
