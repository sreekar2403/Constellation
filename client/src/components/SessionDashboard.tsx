import React, { useState } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import type { TopologyMode } from '@constellation/shared';

interface SessionDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPOLOGY_LABELS: Record<TopologyMode, string> = {
  sequential: 'Sequential',
  parallel: 'Parallel',
  hierarchical: 'Hierarchical',
  'peer-to-peer': 'Peer-to-Peer',
  auto: 'Auto',
};

export const SessionDashboard: React.FC<SessionDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const sessions = useSessionStore((s) => s.sessions);
  const currentSession = useSessionStore((s) => s.currentSession);
  const createSession = useSessionStore((s) => s.createSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const loadSession = useSessionStore((s) => s.loadSession);
  const saveSession = useSessionStore((s) => s.saveSession);

  const [newName, setNewName] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (newName.trim()) {
      createSession(newName.trim());
      setNewName('');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxHeight: '80vh',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: 24,
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 400,
              color: '#e2e8f0',
              letterSpacing: '0.05em',
            }}
          >
            Session Manager
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px 8px',
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Create new session */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <input
            placeholder="New session name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '8px 12px',
              color: '#e2e8f0',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCreate}
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            Create
          </button>
        </div>

        {/* Session list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.length === 0 && (
            <div
              style={{
                color: '#475569',
                textAlign: 'center',
                padding: 24,
                fontSize: '0.85rem',
              }}
            >
              No saved sessions. Create one above.
            </div>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background:
                  currentSession?.id === session.id ? '#1e293b' : 'transparent',
                border:
                  currentSession?.id === session.id
                    ? '1px solid #334155'
                    : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => loadSession(session.id)}
            >
              <span style={{ fontSize: '1rem', color: '#6366f1' }}>✦</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#e2e8f0',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 2,
                    fontSize: '0.65rem',
                    color: '#64748b',
                  }}
                >
                  <span>
                    {TOPOLOGY_LABELS[session.topology] ?? session.topology}
                  </span>
                  <span>·</span>
                  <span>{session.agents.length} agents</span>
                  <span>·</span>
                  <span>
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadSession(session.id);
                  saveSession();
                }}
                title="Save"
                style={{
                  background: 'none',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                }}
              >
                Save
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                title="Delete"
                style={{
                  background: 'none',
                  border: '1px solid #7f1d1d',
                  borderRadius: 4,
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                }}
              >
                Del
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
