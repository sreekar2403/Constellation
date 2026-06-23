import React from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { Badge } from '../ui';

const AGENT_COLORS: Record<string, string> = {
  claude: 'bg-agent-claude',
  gemini: 'bg-agent-gemini',
  opencode: 'bg-agent-opencode',
  ollama: 'bg-agent-ollama',
};

const AGENT_ICONS: Record<string, string> = {
  claude: '🟠',
  gemini: '🔵',
  opencode: '🟣',
  ollama: '🟢',
};

export const AgentStatus: React.FC = () => {
  const agents = useAgentStore((s) => s.agents);
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-text-tertiary text-sm gap-2">
        <div className="w-10 h-10 rounded-full bg-bg-tertiary/50 flex items-center justify-center">
          <span className="text-lg">🤖</span>
        </div>
        <span>No active agents</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {agentList.map((agent) => {
        const color = AGENT_COLORS[agent.tool] || 'bg-text-tertiary';
        const icon = AGENT_ICONS[agent.tool] || '⚪';

        return (
          <div
            key={agent.id}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-primary shadow-sm hover:shadow-md hover:border-accent-primary/30 transition-all duration-150"
          >
            {/* Status Indicator */}
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              {agent.state === 'executing' && (
                <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${color} animate-ping opacity-75`} />
              )}
            </div>

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-sm font-medium text-text-primary truncate">
                  {agent.name}
                </span>
              </div>
              <div className="text-xs text-text-tertiary truncate">
                {agent.workingDirectory?.split(/[/\\]/).pop() || 'Unknown'}
              </div>
            </div>

            {/* Status Badge */}
            <Badge
              variant={agent.state === 'executing' ? 'success' : 'default'}
              size="sm"
            >
              {agent.state}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
