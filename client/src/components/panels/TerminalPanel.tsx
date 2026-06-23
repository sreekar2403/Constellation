import React, { useRef, useEffect, useState } from 'react';
import { useLogStore, type LogEntry } from '../../store/useLogStore';
import { useUIStore } from '../../store/useUIStore';

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  info: '#94a3b8',
  output: '#e2e8f0',
  error: '#ef4444',
  input: '#22c55e',
  system: '#6366f1',
};

const LEVEL_PREFIX: Record<LogEntry['level'], string> = {
  info: 'ℹ',
  output: '',
  error: '✖',
  input: '→',
  system: '◆',
};

export const TerminalPanel: React.FC = () => {
  const logs = useLogStore((s) => s.logs);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [asking, setAsking] = useState(false);

  const allEntities = React.useMemo(() => {
    const entries = Object.values(logs).flat();
    // Filter by selected agent if one is selected
    const filtered = selectedAgentId
      ? entries.filter((e) => e.agentId === selectedAgentId)
      : entries;
    return filtered.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [logs, selectedAgentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allEntities.length]);

  const handleAsk = async () => {
    const question = window.prompt('Ask the knowledge base:');
    if (question === null) return;
    setAsking(true);
    try {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, topK: 5 })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Expecting { results: [{ title, excerpt, score }] }
      if (data.results && data.results.length > 0) {
        const top = data.results[0];
        const excerpt = top.excerpt ?? top.title ?? JSON.stringify(top);
        alert(`Answer: ${excerpt}`);
      } else {
        alert('No results found.');
      }
    } catch (err) {
      alert('Error: ' + (err as Error)?.message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div
      ref={scrollRef}
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '8px',
        fontFamily: "'Cascadia Code', 'Fira Code', monospace",
        fontSize: '0.75rem',
        lineHeight: 1.5,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-text-terminal">Terminal</h3>
        <button
          onClick={handleAsk}
          disabled={asking}
          className={`ml-4 px-3 py-1 text-xs rounded bg-glass hover:bg-glass-elevated text-text-primary transition-colors ${
            asking ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {asking ? 'Asking...' : 'Ask Knowledge Base'}
        </button>
      </div>

      {allEntities.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', marginTop: 40, fontSize: '0.8rem' }}>
          {selectedAgentId
            ? 'No output for selected agent'
            : 'No agent output yet. Connect and start agents to see output here.'}
        </div>
      )}

      {allEntities.map((entry) => (
        <div
          key={entry.id}
          style={{
            color: LEVEL_COLORS[entry.level],
            padding: '1px 4px',
            borderLeft: `2px solid ${LEVEL_COLORS[entry.level]}33`,
            marginBottom: 1,
            wordBreak: 'break-all',
          }}
        >
          {entry.level !== 'output' && (
            <span style={{ marginRight: 6, opacity: 0.7 }}>
              {LEVEL_PREFIX[entry.level]}
            </span>
          )}
          <span style={{ opacity: 0.5, marginRight: 8, fontSize: '0.65rem' }}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span style={{ opacity: 0.6, marginRight: 6, fontSize: '0.65rem' }}>
            [{entry.agentName}]
          </span>
          {entry.text}
        </div>
      ))}
    </div>
  );
};