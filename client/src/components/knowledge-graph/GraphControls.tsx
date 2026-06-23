import React from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { Input, Button, Badge } from '../ui';

export const GraphControls: React.FC = () => {
  const { filter, setFilter, graph, status } = useGraphStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ search: e.target.value });
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = filter.types.includes(type)
      ? filter.types.filter((t) => t !== type)
      : [...filter.types, type];
    setFilter({ types: newTypes });
  };

  const handleSimilarityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ minSimilarity: parseFloat(e.target.value) });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-bg-secondary border-b border-border-primary">
      {/* Search */}
      <Input
        placeholder="Search files..."
        value={filter.search}
        onChange={handleSearchChange}
      />

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleTypeToggle('file')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm transition-all duration-150 active:scale-95 ${
            filter.types.includes('file')
              ? 'bg-accent-primary text-white shadow-md'
              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary hover:shadow-sm'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => handleTypeToggle('directory')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm transition-all duration-150 active:scale-95 ${
            filter.types.includes('directory')
              ? 'bg-accent-primary text-white shadow-md'
              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary hover:shadow-sm'
          }`}
        >
          Folders
        </button>
      </div>

      {/* Similarity Threshold */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-tertiary">
          Similarity: {filter.minSimilarity.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={filter.minSimilarity}
          onChange={handleSimilarityChange}
          className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-accent-primary"
        />
      </div>

      {/* Stats */}
      {graph && (
        <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
          <Badge variant="info">{graph.stats.totalFiles} files</Badge>
          <Badge variant="info">{graph.stats.totalDirectories} dirs</Badge>
          {graph.stats.totalEdges > 0 && (
            <Badge variant="info">{graph.stats.totalEdges} edges</Badge>
          )}
        </div>
      )}

      {/* Status */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-status-warning">
          <div className="w-2 h-2 rounded-full bg-status-warning animate-pulse" />
          Indexing...
        </div>
      )}
    </div>
  );
};
