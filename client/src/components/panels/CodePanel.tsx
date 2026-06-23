import React from 'react';
import { useLogStore } from '../../store/useLogStore';
import { useUIStore } from '../../store/useUIStore';

export const CodePanel: React.FC = () => {
  const fileChanges = useLogStore((s) => s.fileChanges);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);

  const filtered = React.useMemo(() => {
    if (!selectedAgentId) return fileChanges;
    return fileChanges.filter((f) => f.agentId === selectedAgentId);
  }, [fileChanges, selectedAgentId]);

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'created':
        return '+';
      case 'modified':
        return '~';
      case 'deleted':
        return '-';
      default:
        return '?';
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'created':
        return '#22c55e';
      case 'modified':
        return '#f59e0b';
      case 'deleted':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

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
        File Changes {filtered.length > 0 && `(${filtered.length})`}
      </div>

      {filtered.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', marginTop: 32, fontSize: '0.75rem' }}>
          {selectedAgentId
            ? 'No file changes for selected agent'
            : 'No file changes yet'}
        </div>
      )}

      {filtered.map((change) => (
        <div
          key={change.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 4px',
            borderBottom: '1px solid #1e293b',
            fontSize: '0.75rem',
          }}
        >
          <span
            style={{
              color: getChangeColor(change.changeType),
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              width: 16,
              textAlign: 'center',
            }}
          >
            {getChangeIcon(change.changeType)}
          </span>
          <span style={{ color: '#e2e8f0', flex: 1, wordBreak: 'break-all' }}>
            {change.filePath}
          </span>
          <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
            {new Date(change.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
};
