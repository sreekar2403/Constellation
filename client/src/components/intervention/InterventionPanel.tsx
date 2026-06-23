import React, { useState } from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { useLogStore, createLogEntry } from '../../store/useLogStore';

export const InterventionPanel: React.FC = () => {
  const agents = useAgentStore((s) => s.agents);
  const addLog = useLogStore((s) => s.addLog);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  // Find agents waiting for input
  const waitingAgents = Object.values(agents).filter(
    (a) => a.state === 'waiting_for_input' && a.pendingQuestion
  );

  const hasWaiting = waitingAgents.length > 0;
  const activeAgent = activeAgentId
    ? agents[activeAgentId]
    : waitingAgents[0] ?? null;

  const handleSend = () => {
    if (!activeAgent || !inputText.trim()) return;

    // Log the input locally
    addLog(
      createLogEntry(activeAgent.id, activeAgent.name, inputText, 'input')
    );

    // Send via WebSocket will be done by the useWebSocket hook
    // For now, store the intent and dispatch on WS connect
    const wsEvent = new CustomEvent('constellation:send_input', {
      detail: { agentId: activeAgent.id, input: inputText },
    });
    window.dispatchEvent(wsEvent);

    // Clear the pending question locally
    useAgentStore.getState().setPendingQuestion(activeAgent.id, null);
    setInputText('');
  };

  const handleQuickReply = (reply: string) => {
    setInputText(reply);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          bottom: 60,
          right: 16,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: hasWaiting ? '#f59e0b' : '#1e293b',
          color: hasWaiting ? '#000' : '#64748b',
          cursor: 'pointer',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hasWaiting
            ? '0 0 12px rgba(245,158,11,0.5)'
            : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}
        title={
          hasWaiting
            ? `${waitingAgents.length} agent(s) waiting`
            : 'Intervention'
        }
      >
        {hasWaiting ? (
          <span style={{ position: 'relative' }}>
            !
            <span
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                fontSize: '0.6rem',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {waitingAgents.length}
            </span>
          </span>
        ) : (
          '⚡'
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 60,
        right: 16,
        zIndex: 20,
        width: 340,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
          Intervention
          {waitingAgents.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.65rem',
                color: '#f59e0b',
                background: '#451a03',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {waitingAgents.length} pending
            </span>
          )}
        </span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: 2,
          }}
        >
          ✕
        </button>
      </div>

      {/* Agent selector */}
      {waitingAgents.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 10px',
            borderBottom: '1px solid #1e293b',
            flexWrap: 'wrap',
          }}
        >
          {waitingAgents.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveAgentId(a.id)}
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid',
                borderColor:
                  activeAgentId === a.id ? '#6366f1' : '#334155',
                background:
                  activeAgentId === a.id ? '#312e81' : 'transparent',
                color: activeAgentId === a.id ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.65rem',
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Question display */}
      {activeAgent?.pendingQuestion && (
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              color: '#f59e0b',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}
          >
            {activeAgent.name} asks:
          </div>
          <div
            style={{
              color: '#e2e8f0',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              fontFamily: 'monospace',
              background: '#1a1a2e',
              padding: 8,
              borderRadius: 6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {activeAgent.pendingQuestion.promptText}
          </div>

          {/* Suggested replies */}
          {activeAgent.pendingQuestion.suggestedReplies.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 4,
                marginTop: 8,
                flexWrap: 'wrap',
              }}
            >
              {activeAgent.pendingQuestion.suggestedReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '8px 10px', display: 'flex', gap: 6 }}>
        <input
          placeholder={
            activeAgent
              ? `Reply to ${activeAgent.name}...`
              : 'No agents waiting'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={!activeAgent}
          style={{
            flex: 1,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '8px 10px',
            color: '#e2e8f0',
            fontSize: '0.8rem',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!activeAgent || !inputText.trim()}
          style={{
            background: '#6366f1',
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            color: '#fff',
            cursor: activeAgent ? 'pointer' : 'default',
            fontSize: '0.75rem',
            opacity: activeAgent ? 1 : 0.4,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
