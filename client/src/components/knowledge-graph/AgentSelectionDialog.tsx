import React, { useState } from 'react';

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  color: string;
}

const AVAILABLE_AGENTS: AgentProfile[] = [
  {
    id: 'cascade',
    name: 'Cascade',
    description:
      'Full-stack coding agent with deep reasoning. Writes, debugs, and refactors code autonomously across your entire stack.',
    icon: '⚡',
    capabilities: [
      'Code generation & refactoring',
      'Bug diagnosis & fixing',
      'Test writing',
      'Multi-file changes',
    ],
    color: '#6366f1',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description:
      'High-level planning agent. Decomposes complex tasks, delegates to sub-agents, and ensures end-to-end completion.',
    icon: '✦',
    capabilities: [
      'Task decomposition',
      'Sub-agent coordination',
      'Progress tracking',
      'Quality verification',
    ],
    color: '#f59e0b',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description:
      'Codebase understanding specialist. Reads, searches, and maps code structure to answer questions and find patterns.',
    icon: '🔍',
    capabilities: [
      'Codebase search & grep',
      'Dependency mapping',
      'Architecture analysis',
      'Documentation reading',
    ],
    color: '#06b6d4',
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description:
      'Code review expert. Analyzes changes for bugs, security issues, style problems, and architecture concerns.',
    icon: '✓',
    capabilities: [
      'Code quality analysis',
      'Security audit',
      'Performance review',
      'Style compliance',
    ],
    color: '#10b981',
  },
];

interface AgentSelectionDialogProps {
  open: boolean;
  folderPath: string;
  onClose: () => void;
  onStartAgent: (agentId: string, folderPath: string) => void;
}

export const AgentSelectionDialog: React.FC<AgentSelectionDialogProps> = ({
  open,
  folderPath,
  onClose,
  onStartAgent,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const folderName = folderPath.split(/[/\\]/).pop() || folderPath;

  const handleStart = async () => {
    if (!selectedAgent) return;
    setProcessing(true);
    try {
      await onStartAgent(selectedAgent, folderPath);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          width: 520,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#e2e8f0',
              marginBottom: 4,
            }}
          >
            Select Agent Type
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📁</span>
            <span
              style={{
                background: '#1e293b',
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: '0.68rem',
                color: '#94a3b8',
              }}
            >
              {folderPath}
            </span>
          </div>
        </div>

        {/* Agent cards */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {AVAILABLE_AGENTS.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
                border:
                  selectedAgent === agent.id
                    ? `1px solid ${agent.color}`
                    : '1px solid #1e293b',
                background:
                  selectedAgent === agent.id
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedAgent !== agent.id) {
                  e.currentTarget.style.background = '#1a1a2e';
                  e.currentTarget.style.borderColor = '#334155';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedAgent !== agent.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#1e293b';
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    background: `${agent.color}15`,
                    border: `1px solid ${agent.color}30`,
                    flexShrink: 0,
                  }}
                >
                  {agent.icon}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      marginBottom: 2,
                    }}
                  >
                    {agent.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#94a3b8',
                      lineHeight: 1.4,
                      marginBottom: 8,
                    }}
                  >
                    {agent.description}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          fontSize: '0.6rem',
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: `${agent.color}15`,
                          color: agent.color,
                          border: `1px solid ${agent.color}20`,
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1a1a2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!selectedAgent || processing}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: selectedAgent ? '#6366f1' : '#1e293b',
              color: selectedAgent ? '#fff' : '#475569',
              fontSize: '0.78rem',
              cursor: selectedAgent ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {processing ? (
              <>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    border: '2px solid #a5b4fc',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                Starting...
              </>
            ) : (
              <>Launch Agent →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

