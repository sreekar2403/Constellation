import React, { useState } from 'react';
import { TerminalPanel } from './TerminalPanel';
import { CodePanel } from './CodePanel';
import { FileBrowserPanel } from './FileBrowserPanel';
import { MemoryPanel } from './MemoryPanel';
import { ChatPanel } from './ChatPanel';

type PanelType = 'terminal' | 'code' | 'files' | 'memory' | 'chat';

const PANEL_ICONS: Record<PanelType, string> = {
  terminal: '>_',
  code: '{ }',
  files: '📁',
  memory: '🧠',
  chat: '💬',
};

const PANEL_LABELS: Record<PanelType, string> = {
  terminal: 'Terminal',
  code: 'Code',
  files: 'Files',
  memory: 'Memory',
  chat: 'Chat',
};

export const PanelContainer: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>('terminal');
  const [panelWidth, setPanelWidth] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isResizing = React.useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(250, Math.min(800, startWidth - (e.clientX - startX)));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'terminal':
        return <TerminalPanel />;
      case 'code':
        return <CodePanel />;
      case 'files':
        return <FileBrowserPanel />;
      case 'memory':
        return <MemoryPanel />;
      case 'chat':
        return <ChatPanel />;
      default:
        return <div />;
    }
  };

  const panelTypes: PanelType[] = ['terminal', 'code', 'files', 'memory', 'chat'];

  return (
    <>
      {/* Collapse toggle tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          right: isCollapsed ? 0 : panelWidth,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRight: isCollapsed ? 'none' : undefined,
          color: '#94a3b8',
          padding: '8px 4px',
          cursor: 'pointer',
          borderRadius: '4px 0 0 4px',
          fontSize: '10px',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transition: 'right 0.2s',
        }}
      >
        {isCollapsed ? '◀ Panels' : '▶'}
      </button>

      {/* Panel drawer */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: isCollapsed ? 0 : panelWidth,
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s',
          overflow: 'hidden',
          zIndex: 15,
        }}
      >
        {/* Panel tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          {panelTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActivePanel(type)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: '0.75rem',
                border: 'none',
                background: activePanel === type ? '#1e293b' : 'transparent',
                color: activePanel === type ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{PANEL_ICONS[type]}</span>
              <span>{PANEL_LABELS[type]}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {renderPanel()}
        </div>
      </div>
    </>
  );
};