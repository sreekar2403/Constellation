import React, { useEffect } from 'react';
import {
  ListTodo,
  Cpu,
  CheckCircle2,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useSystemStatsStore } from '../../store/useSystemStatsStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useProviderStore } from '../../store/useProviderStore';
import { useSkillStore } from '../../store/useSkillStore';

interface KPI {
  label: string;
  value: number;
  delta?: number;
  DeltaIcon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accent: string;
}

export function KPIStrip() {
  const { stats, loading } = useSystemStatsStore();
  const { tasks } = useTaskStore();
  const { providers } = useProviderStore();

  // Hydrate all stores on mount (safe to call multiple times — stores guard against double-fetch)
  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateProvider = useProviderStore((s) => s.hydrate);
  const hydrateStats = useSystemStatsStore((s) => s.hydrate);
  const hydrateSkill = useSkillStore((s) => s.hydrate);
  const startPolling = useSystemStatsStore((s) => s.startPolling);

  useEffect(() => {
    void hydrateTask();
    void hydrateProvider();
    void hydrateStats();
    void hydrateSkill();
    const cleanup = startPolling(30_000);
    return cleanup;
  }, [hydrateTask, hydrateProvider, hydrateStats, hydrateSkill, startPolling]);

  const liveProviders = Object.values(providers).filter((p) => p.healthStatus === 'live').length;
  const totalProviders = Object.values(providers).length;

  const kpis: KPI[] = [
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      delta: stats.activeTasks,
      DeltaIcon: ListTodo,
      accent: 'var(--accent-cyan)',
    },
    {
      label: 'Active Now',
      value: stats.activeTasks,
      delta: 0,
      DeltaIcon: Cpu,
      accent: 'var(--accent-violet)',
    },
    {
      label: 'Completed',
      value: stats.completedTasks,
      delta: 2,
      DeltaIcon: CheckCircle2,
      accent: 'var(--accent-green)',
    },
    {
      label: 'Tokens Used',
      value: stats.totalTokensUsed,
      delta: stats.totalTokensSaved,
      DeltaIcon: Zap,
      accent: 'var(--accent-amber)',
    },
  ];

  return (
    <div className="flex gap-4">
      {kpis.map((kpi) => {
        const DeltaIcon = kpi.delta !== undefined && kpi.delta !== 0 ? TrendingUp : TrendingDown;
        const isPositive = kpi.delta === undefined || kpi.delta >= 0;
        return (
          <div
            key={kpi.label}
            className="flex-1 rounded-xl border border-white/8 bg-white/4 px-5 py-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium tracking-widest uppercase text-white/50">
                {kpi.label}
              </span>
              <DeltaIcon
                size={12}
                strokeWidth={2}
                className={isPositive ? 'text-emerald-400' : 'text-rose-400'}
              />
            </div>
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: kpi.accent }}
            >
              {loading ? '—' : kpi.value.toLocaleString()}
            </div>
            {kpi.delta !== undefined && kpi.delta > 0 && (
              <div className="mt-1 text-xs text-white/40">
                +{kpi.delta} today
              </div>
            )}
            {kpi.label === 'Active Now' && liveProviders > 0 && (
              <div className="mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/40">
                  {liveProviders}/{totalProviders} providers
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}