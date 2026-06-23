import React from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { useUIStore } from '../../store/useUIStore';

interface VirtualFileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: VirtualFileNode[];
  agentId?: string;
}

export const FileBrowserPanel: React.FC = () => {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);

  const agentList = React.useMemo(() => {
    const entries = Object.values(agents);
    if (selectedAgentId) {
      return entries.filter((a) => a.id === selectedAgentId);
    }
    return entries;
  }, [agents, selectedAgentId]);

  // Build virtual file tree from agent working directories
  const fileTree: VirtualFileNode[] = React.useMemo(() => {
    const tree: VirtualFileNode[] = [];
    const rootMap = new Map<string, VirtualFileNode>();

    for (const agent of agentList) {
      const wd = agent.workingDirectory;
      if (!wd || wd === '.') continue;

      const parts = wd.replace(/\\/g, '/').split('/').filter(Boolean);
      let current = tree;
      let currentPath = '';

      for (const part of parts) {
        currentPath += '/' + part;
        let node = current.find((n) => n.name === part);
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
            agentId: agent.id,
          };
          current.push(node);
        }
        if (node.children) current = node.children;
      }
    }

    return tree;
  }, [agentList]);

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
        Workspace ({agentList.length} agent{agentList.length !== 1 ? 's' : ''})
      </div>

      {agentList.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', marginTop: 32, fontSize: '0.75rem' }}>
          No active agents
        </div>
      )}

      <div style={{ paddingLeft: 0 }}>
        {agentList.map((agent) => (
          <div key={agent.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 4px',
                borderRadius: 4,
                background: agent.id === selectedAgentId ? '#1e293b' : 'transparent',
              }}
            >
              <span style={{ color: '#6366f1', fontSize: '0.7rem' }}>📁</span>
              <span style={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                {agent.name}
              </span>
              <span style={{ color: '#475569', fontSize: '0.65rem', marginLeft: 'auto' }}>
                {agent.state}
              </span>
            </div>
            <div
              style={{
                color: '#64748b',
                fontSize: '0.65rem',
                padding: '2px 4px 2px 20px',
                fontFamily: 'monospace',
              }}
            >
              {agent.workingDirectory}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
