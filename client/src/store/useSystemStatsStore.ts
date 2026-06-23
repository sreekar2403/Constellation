/**
 * useSystemStatsStore — aggregated dashboard metrics.
 *
 * Polls GET /api/stats every 30 seconds to keep the KPI strip fresh.
 * Also fetches on hydration so the dashboard has data immediately.
 */
import { create } from 'zustand';
import type { SystemStats } from '@constellation/shared';

interface SystemStatsStore {
  stats: SystemStats;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  hydrate: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void; // returns cleanup fn
}

const DEFAULT_STATS: SystemStats = {
  totalTasks: 0,
  activeTasks: 0,
  completedTasks: 0,
  totalTokensUsed: 0,
  totalTokensSaved: 0,
  activeAgents: 0,
  liveProviders: 0,
  totalProviders: 0,
  totalSkills: 0,
  skillsFiredToday: 0,
};

export const useSystemStatsStore = create<SystemStatsStore>((set) => ({
  stats: DEFAULT_STATS,
  loading: false,
  error: null,
  lastUpdated: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`GET /api/stats failed: ${res.statusText}`);
      const stats: SystemStats = await res.json();
      set({ stats, loading: false, lastUpdated: new Date().toISOString() });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  startPolling: (intervalMs = 30_000) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const stats: SystemStats = await res.json();
        set({ stats, lastUpdated: new Date().toISOString() });
      } catch {
        // Non-fatal — keep previous stats on network failure
      }
    }, intervalMs);
    return () => clearInterval(timer);
  },
}));