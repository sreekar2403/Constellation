import React from 'react';
import type { LayoutMode } from './TopologyEngine';

interface LayoutSelectorProps {
  currentMode: LayoutMode;
  onChange: (mode: LayoutMode) => void;
}

const MODES: { value: LayoutMode; label: string; icon: string }[] = [
  { value: 'neural', label: 'Neural', icon: '✦' },
  { value: 'timeline', label: 'Timeline', icon: '≡' },
  { value: 'hierarchy', label: 'Hierarchy', icon: '⊞' },
  { value: 'focus', label: 'Focus', icon: '◎' },
];

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  currentMode,
  onChange,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: 4,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 8,
        padding: 4,
      }}
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background:
              currentMode === mode.value ? '#6366f1' : 'transparent',
            color: currentMode === mode.value ? '#fff' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.72rem',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: '0.8rem' }}>{mode.icon}</span>
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};
