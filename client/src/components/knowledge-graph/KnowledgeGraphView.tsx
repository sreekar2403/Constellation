import React, { useEffect, useState } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { ForceGraph } from './ForceGraph';
import { GraphControls } from './GraphControls';
import { FilePreview } from './FilePreview';
import { Button } from '../ui';
import { Canvas } from '@react-three/fiber';

interface KnowledgeGraphViewProps {
  onSelectFolder: (folderPath: string) => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onSelectFolder,
}) => {
  const { graph, status, error, fetchGraph } = useGraphStore();
  const [showControls, setShowControls] = useState(true);

  // Auto-fetch graph if we have a root path in localStorage
  useEffect(() => {
    const savedRoot = localStorage.getItem('constellation-root-path');
    if (savedRoot && status === 'idle') {
      fetchGraph(savedRoot);
    }
  }, [status, fetchGraph]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar with Controls Toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-primary bg-bg-secondary shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            Knowledge Graph
          </span>
          {graph && (
            <span className="text-xs text-text-tertiary px-2 py-0.5 rounded-full bg-bg-tertiary/50">
              {graph.nodes.length} nodes, {graph.edges.length} edges
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? 'Hide Controls' : 'Show Controls'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const root = localStorage.getItem('constellation-root-path');
              if (root) fetchGraph(root);
            }}
          >
            Rebuild
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Controls */}
        {showControls && (
          <div className="w-64 border-r border-border-primary bg-bg-secondary overflow-auto">
            <GraphControls />
          </div>
        )}

        {/* Center - Graph */}
        <div
          className="flex-1 relative bg-bg-primary"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-border-primary) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {status === 'loading' && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.04) 0%, transparent 70%)',
              }}
            >
              <div className="flex flex-col items-center gap-4 px-8 py-6 rounded-2xl bg-bg-elevated shadow-lg border border-border-primary">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-accent-primary/30 rounded-full animate-spin" />
                  <div
                    className="absolute inset-0 w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"
                    style={{ animationDuration: '0.8s' }}
                  />
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-text-primary block">
                    Building knowledge graph
                  </span>
                  <span className="text-xs text-text-tertiary mt-1 block">
                    Scanning files and computing embeddings...
                  </span>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-4 px-8 py-6 rounded-2xl bg-bg-elevated shadow-lg border border-border-primary">
                <div className="w-12 h-12 rounded-full bg-status-error/10 flex items-center justify-center">
                  <span className="text-status-error text-xl">!</span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-status-error">{error}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const root = localStorage.getItem('constellation-root-path');
                    if (root) fetchGraph(root);
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 px-8 py-6 rounded-2xl bg-bg-elevated/80 shadow-md border border-border-primary backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center">
                  <span className="text-accent-primary text-2xl">✦</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-text-primary block">
                    No graph data available
                  </span>
                  <span className="text-xs text-text-tertiary mt-1 block">
                    Select a workspace to get started
                  </span>
                </div>
              </div>
            </div>
          )}

          <Canvas className="absolute inset-0">
            <ForceGraph />
          </Canvas>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-72 border-l border-border-primary bg-bg-secondary shadow-sm overflow-auto p-3">
          <FilePreview />
        </div>
      </div>
    </div>
  );
};
