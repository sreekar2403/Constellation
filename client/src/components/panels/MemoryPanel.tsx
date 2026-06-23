import React from 'react';
import { useLogStore } from '../../store/useLogStore';
import { useUIStore } from '../../store/useUIStore';

const CATEGORY_COLORS: Record<string, string> = {
  file: '#22c55e',
  pattern: '#6366f1',
  decision: '#f59e0b',
  context: '#94a3b8',
};

export const MemoryPanel: React.FC = () => {
  const memories = useLogStore((s) => s.memories);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);

  const filtered = React.useMemo(() => {
    if (!selectedAgentId) return memories;
    return memories.filter((m) => m.agentId === selectedAgentId);
  }, [memories, selectedAgentId]);

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '8px',
        fontSize: '0.8rem',
      }}
    >
      <div
        style={{
          color: '#94a3b8',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 12,
          padding: '0 4px',
        }}
      >
        Agent Memory {filtered.length > 0 && `(${filtered.length})`}
      </div>

      {filtered.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', marginTop: 32, fontSize: '0.75rem' }}>
          {selectedAgentId
            ? 'No memory entries for selected agent'
            : 'No memory entries yet'}
        </div>
      )}

      {filtered.map((entry) => (
        <div
          key={entry.id}
          style={{
            padding: '8px 4px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: CATEGORY_COLORS[entry.category] ?? '#94a3b8',
              }}
            />
            <span
              style={{
                color: CATEGORY_COLORS[entry.category] ?? '#94a3b8',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {entry.category}
            </span>
            <span style={{ color: '#475569', fontSize: '0.6rem', marginLeft: 'auto' }}>
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', lineHeight: 1.4 }}>
            {entry.content}
          </div>
        </div>
      ))}
    </div>
  );
};
