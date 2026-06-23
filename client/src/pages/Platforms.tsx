import React, { useEffect, useState } from 'react';
import { RefreshCw, Plug, Zap } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { ProviderCard } from '../components/platforms/ProviderCard';
import type { ProviderMeta } from '../components/platforms/ProviderCard';

export const Platforms: React.FC = () => {
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMeta = async () => {
    try {
      setError(null);
      const res = await fetch('/api/providers/meta');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: ProviderMeta[] = await res.json();
      setProviders(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMeta();
  }, []);

  const liveCount = providers.filter((p) => p.isLive).length;
  const errorCount = providers.filter((p) => p.error).length;

  return (
    <PageShell
      title="AI Platforms"
      subtitle={
        liveCount > 0
          ? `${liveCount} provider${liveCount > 1 ? 's' : ''} live · ${errorCount > 0 ? `${errorCount} error` : 'all healthy'}`
          : 'none connected — click Connect to start'
      }
      action={
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-tertiary">
            {lastRefresh
              ? `updated ${lastRefresh.toLocaleTimeString()}`
              : ''}
          </span>
          <button
            onClick={() => { setLoading(true); void fetchMeta(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-glass hover:bg-glass-elevated border border-border-primary text-text-secondary text-xs transition-colors disabled:opacity-50"
            title="Refresh provider status"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-gradient-to-br from-accent-primary to-accent-secondary text-text-inverse text-xs font-semibold opacity-40 cursor-not-allowed shadow-glow-cyan"
            title="Bulk auto-discovery — coming Phase 9"
          >
            <Zap size={11} />
            Auto-detect
          </button>
        </div>
      }
    >
      {loading && providers.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-3 text-text-tertiary text-sm">
            <RefreshCw size={16} className="animate-spin" />
            Scanning providers...
          </div>
        </div>
      ) : error && providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <div className="text-red-400 text-sm">Failed to load providers: {error}</div>
          <button
            onClick={() => { setLoading(true); void fetchMeta(); }}
            className="px-4 h-8 rounded-md bg-glass-elevated border border-border-primary text-text-secondary text-xs hover:bg-glass hover:text-text-primary transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {providers.map((p) => (
            <ProviderCard key={p.id} meta={p} />
          ))}
        </div>
      )}
    </PageShell>
  );
};