import React, { useEffect, useState } from 'react';
import { useGraphStore, GraphNode } from '../../store/useGraphStore';
import { Badge, Button } from '../ui';

interface FileContent {
  path: string;
  content: string;
  size: number;
}

export const FilePreview: React.FC = () => {
  const { selectedNode, selectNode } = useGraphStore();
  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode || selectedNode.type === 'directory') {
      setContent(null);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/files/content?path=${encodeURIComponent(selectedNode.id)}`
        );
        if (response.ok) {
          const data = await response.json();
          setContent(data);
        }
      } catch (err) {
        console.error('Failed to fetch file content:', err);
      }
      setLoading(false);
    };

    fetchContent();
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">
        Click a node to preview
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {selectedNode.name}
          </div>
          <div className="text-xs text-text-tertiary truncate">
            {selectedNode.id}
          </div>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors active:scale-90"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-tertiary"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2">
        <Badge>{selectedNode.type}</Badge>
        {selectedNode.extension && <Badge>{selectedNode.extension}</Badge>}
        {selectedNode.size > 0 && <Badge>{formatSize(selectedNode.size)}</Badge>}
      </div>

      {/* Agent Activity */}
      {selectedNode.agentActivity && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-status-success/5 border border-status-success/20">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-status-success" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-status-success animate-ping opacity-75" />
          </div>
          <span className="text-status-success font-medium">
            Active: {selectedNode.agentActivity}
          </span>
        </div>
      )}

      {/* Content Preview */}
      {selectedNode.type === 'file' && (
        <div className="mt-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <div className="w-3 h-3 border border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
              Loading...
            </div>
          ) : content ? (
            <pre className="p-3 bg-bg-primary rounded-xl border border-border-primary text-xs text-text-secondary overflow-auto max-h-64 font-mono shadow-inner">
              {content.content.slice(0, 2000)}
              {content.content.length > 2000 && '\n... (truncated)'}
            </pre>
          ) : (
            <div className="text-xs text-text-tertiary">No preview available</div>
          )}
        </div>
      )}
    </div>
  );
};
