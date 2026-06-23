import React, { useMemo } from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { useUIStore } from '../../store/useUIStore';
import { useLogStore } from '../../store/useLogStore';
import type { AgentNode } from '@constellation/shared';

const STATE_COLORS: Record<string, string> = {
  initializing: '#94a3b8',
  idle: '#22c55e',
  executing: '#3b82f6',
  thinking: '#a855f7',
  waiting_for_input: '#f59e0b',
  completed: '#22c55e',
  error: '#ef4444',
};

function getColor(state: AgentNode['state']): string {
  return STATE_COLORS[state] ?? '#94a3b8';
}

const AgentCard: React.FC<{
  agent: AgentNode;
  isSelected: boolean;
  onClick: () => void;
  tabIndex: number;
}> = ({ agent, isSelected, onClick, tabIndex }) => {
  return (
    <button
      onClick={onClick}
      tabIndex={tabIndex}
      aria-label={`Agent ${agent.name}, state: ${agent.state}`}
      aria-selected={isSelected}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 8,
        border: `1px solid ${isSelected ? '#6366f1' : '#1e293b'}`,
        background: isSelected ? '#1e293b' : '#0f172a',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        transition: 'all 0.15s',
        outline: isSelected ? '2px solid #6366f1' : 'none',
      }}
    >
      {/* State indicator */}
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: getColor(agent.state),
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {agent.name}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
          {agent.tool} · {agent.state}
          {agent.pendingQuestion && ' · ⚠ waiting'}
        </div>
      </div>

      {/* Tool icon */}
      <span
        style={{
          fontSize: '0.65rem',
          color: '#475569',
          background: '#1a1a2e',
          padding: '2px 6px',
          borderRadius: 4,
          fontFamily: 'monospace',
        }}
      >
        {agent.tool}
      </span>
    </button>
  );
};

export const FallbackView: React.FC = () => {
  const agents = useAgentStore((s) => s.agents);
  const edges = useAgentStore((s) => s.edges);
  const selectAgent = useUIStore((s) => s.selectAgent);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);
  const logs = useLogStore((s) => s.logs);

  const agentArray = useMemo(() => Object.values(agents), [agents]);
  const edgeArray = useMemo(() => Object.values(edges), [edges]);

  // Get all logs for latest output
  const latestLogs = useMemo(() => {
    const allEntries = Object.values(logs).flat();
    return allEntries
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);
  }, [logs]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a1a',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        gap: 20,
        overflow: 'auto',
      }}
      role="region"
      aria-label="Constellation 2D View"
    >
      {/* Header */}
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 400,
          letterSpacing: '0.08em',
          color: '#e2e8f0',
          paddingBottom: 12,
          borderBottom: '1px solid #1e293b',
        }}
      >
        Constellation — Accessibility View
        <span
          style={{
            marginLeft: 12,
            fontSize: '0.7rem',
            color: '#64748b',
            fontWeight: 300,
          }}
        >
          3D visualization unavailable. Showing 2D fallback.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Agent list */}
        <div
          style={{
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflow: 'auto',
            flexShrink: 0,
          }}
          role="list"
          aria-label="Agent list"
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}
          >
            Agents ({agentArray.length})
          </div>

          {agentArray.length === 0 && (
            <div style={{ color: '#475569', fontSize: '0.8rem', padding: 12 }}>
              No agents yet. Create a session to get started.
            </div>
          )}

          {agentArray.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onClick={() => selectAgent(agent.id)}
              tabIndex={i + 1}
            />
          ))}
        </div>

        {/* Detail panel */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          {/* Selected agent details */}
          {selectedAgentId && agents[selectedAgentId] && (
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Selected Agent Details
              </div>
              {(() => {
                const a = agents[selectedAgentId];
                return (
                  <table
                    style={{
                      width: '100%',
                      fontSize: '0.78rem',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <tbody>
                      {[
                        ['Name', a.name],
                        ['Tool', a.tool],
                        ['State', a.state],
                        ['Model', a.model],
                        ['Directory', a.workingDirectory],
                        ['Role', a.topologyRole],
                        [
                          'Position',
                          `(${a.position.x.toFixed(2)}, ${a.position.y.toFixed(2)}, ${a.position.z.toFixed(2)})`,
                        ],
                        ['Created', new Date(a.createdAt).toLocaleString()],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td
                            style={{
                              padding: '3px 8px',
                              color: '#64748b',
                              width: 100,
                              borderBottom: '1px solid #1e293b',
                            }}
                          >
                            {label}
                          </td>
                          <td
                            style={{
                              padding: '3px 8px',
                              color: '#e2e8f0',
                              borderBottom: '1px solid #1e293b',
                            }}
                          >
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}

          {/* Edge list */}
          {edgeArray.length > 0 && (
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Connections ({edgeArray.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {edgeArray.map((edge) => (
                  <div
                    key={edge.id}
                    style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      padding: '4px 8px',
                      background: '#1a1a2e',
                      borderRadius: 4,
                    }}
                  >
                    {edge.sourceId} → {edge.targetId}
                    <span style={{ color: '#475569', marginLeft: 8 }}>
                      ({edge.type})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent logs */}
          {latestLogs.length > 0 && (
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 14,
                flex: 1,
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Recent Activity
              </div>
              {latestLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    fontSize: '0.7rem',
                    color: '#94a3b8',
                    padding: '2px 0',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ color: '#475569' }}>
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>{' '}
                  <span style={{ color: '#6366f1' }}>{log.agentName}</span>{' '}
                  {log.text.slice(0, 120)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
