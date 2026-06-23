import React, { useState, useEffect } from 'react';
import {
  Activity,
  ListTodo,
  Cpu,
  Sparkles,
  Zap,
  CircleDot,
} from 'lucide-react';

export interface TacticalEvent {
  id: string;
  category: 'task' | 'provider' | 'skill' | 'pattern';
  message: string;
  timestamp: Date;
}

const EVENT_DOT_COLOR: Record<TacticalEvent['category'], string> = {
  task: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]',
  provider: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  skill: 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]',
  pattern: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]',
};

/**
 * TacticalRail — bottom strip persistent across every page.
 * Subscribes to global WebSocket events; renders them as a live ticker.
 * In Phase 1 this is a static empty state; Phase 4 wires it to real events.
 */
export const TacticalRail: React.FC = () => {
  const [events, setEvents] = useState<TacticalEvent[]>([]);
  const [, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setEvents([
      {
        id: 'boot',
        category: 'provider',
        message: 'Constellation OS online — awaiting CEO directives',
        timestamp: new Date(),
      },
    ]);
  }, []);

  return (
    <footer className="flex h-10 w-full items-center gap-4 border-t border-border-primary bg-bg-secondary/80 backdrop-blur-xl px-4 shrink-0 overflow-x-auto z-10">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <Activity size={11} strokeWidth={2} className="text-emerald-400" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-medium">
          Live
        </span>
      </div>

      <div className="h-4 w-px bg-border-primary" />

      {/* Event ticker */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {events.length === 0 ? (
          <span className="text-xs text-text-tertiary italic flex items-center gap-1.5">
            <CircleDot size={11} className="opacity-50" />
            No events yet
          </span>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-left-2"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT_COLOR[evt.category]} shrink-0`}
              />
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {evt.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Totals (placeholder — wired in Phase 5) */}
      <div className="flex items-center gap-3 shrink-0 text-[10px] text-text-tertiary font-mono">
        <span className="flex items-center gap-1">
          <ListTodo size={10} strokeWidth={1.5} />
          <span className="text-text-secondary">0</span>
          <span>tasks</span>
        </span>
        <span className="flex items-center gap-1">
          <Cpu size={10} strokeWidth={1.5} />
          <span className="text-text-secondary">0</span>
          <span>agents</span>
        </span>
        <span className="flex items-center gap-1">
          <Sparkles size={10} strokeWidth={1.5} />
          <span className="text-text-secondary">0</span>
          <span>skills</span>
        </span>
        <span className="flex items-center gap-1">
          <Zap size={10} strokeWidth={1.5} className="text-emerald-400" />
          <span className="text-emerald-400">0</span>
          <span>tokens saved</span>
        </span>
      </div>
    </footer>
  );
};
