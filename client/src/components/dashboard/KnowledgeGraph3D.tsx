import React, { useMemo, useState } from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { Sparkles, Filter, Clock, Atom } from 'lucide-react';
import { ForceGraph } from '../../components/knowledge-graph/ForceGraph';
import { Canvas } from '@react-three/fiber';

/* -----------------------------------------------------------------------------
 * KnowledgeGraph3D — the Dashboard's hero.
 * --------------------------------------------------------------------------- */
type FilterKey = 'all' | 'agents' | 'skills' | 'files';
type RangeKey = '1h' | 'today' | 'week' | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'agents', label: 'Agents' },
  { key: 'skills', label: 'Skills' },
  { key: 'files', label: 'Files' },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1h', label: '1h' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'all', label: 'All' },
];

export const KnowledgeGraph3D: React.FC = () => {
  const agentCount = useAgentStore((s) => Object.keys(s.agents).length);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [range, setRange] = useState<RangeKey>('all');

  return (
    <div className="relative flex-1 bg-atmosphere overflow-hidden">
      {/* Graph fills the container */}
      <div className="absolute inset-0">
        <Canvas>
          <ForceGraph />
        </Canvas>
      </div>

      {/* Filter bar — top */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-glass-elevated rounded-lg p-1">
        <Filter size={11} strokeWidth={1.75} className="text-text-tertiary mx-1" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 h-6 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${
              filter === f.key
                ? 'bg-gradient-to-br from-accent-primary to-accent-secondary text-text-inverse shadow-glow-cyan'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Time range — top right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-glass-elevated rounded-lg p-1">
        <Clock size={11} strokeWidth={1.75} className="text-text-tertiary mx-1" />
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-2 h-6 rounded text-[10px] font-medium font-mono transition-colors ${
              range === r.key
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Layout mode chip — bottom left */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-glass-elevated rounded-lg px-2.5 h-7">
        <Atom size={11} strokeWidth={1.75} className="text-accent-primary" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          Neural
        </span>
        <span className="text-[9px] text-text-tertiary font-mono">
          {agentCount} node{agentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bottom right — KPI legend */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 bg-glass-elevated rounded-lg px-3 h-7">
        <span className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
          <span className="text-text-tertiary">agent</span>
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-secondary shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
          <span className="text-text-tertiary">skill</span>
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-text-tertiary">file</span>
        </span>
      </div>
    </div>
  );
};