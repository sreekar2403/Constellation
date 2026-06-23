import { create } from 'zustand';

export interface GraphNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  extension: string;
  size: number;
  embedding?: number[];
  agentActivity?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'import' | 'similarity' | 'reference';
  weight: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootPath: string;
  lastIndexed: Date;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalEdges: number;
    indexTimeMs: number;
  };
}

interface GraphState {
  graph: Graph | null;
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  filter: {
    types: string[];
    search: string;
    minSimilarity: number;
  };
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;

  // Actions
  setGraph: (graph: Graph | null) => void;
  selectNode: (node: GraphNode | null) => void;
  hoverNode: (node: GraphNode | null) => void;
  setFilter: (filter: Partial<GraphState['filter']>) => void;
  setStatus: (status: GraphState['status']) => void;
  setError: (error: string | null) => void;
  fetchGraph: (rootPath: string) => Promise<void>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: null,
  selectedNode: null,
  hoveredNode: null,
  filter: {
    types: ['file', 'directory'],
    search: '',
    minSimilarity: 0.5,
  },
  status: 'idle',
  error: null,

  setGraph: (graph) => set({ graph }),
  selectNode: (node) => set({ selectedNode: node }),
  hoverNode: (node) => set({ hoveredNode: node }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),

  fetchGraph: async (rootPath: string) => {
    set({ status: 'loading', error: null });

    try {
      // Start indexing
      const indexResponse = await fetch('/api/index/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath }),
      });

      if (!indexResponse.ok) {
        throw new Error('Failed to start indexing');
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch('/api/index/status');
        const status = await statusResponse.json();

        if (status.status === 'ready') {
          // Fetch the graph
          const graphResponse = await fetch('/api/graph');
          if (!graphResponse.ok) {
            throw new Error('Failed to fetch graph');
          }

          const graph = await graphResponse.json();
          set({ graph, status: 'ready' });
          return;
        }

        if (status.status === 'error') {
          throw new Error(status.error || 'Indexing failed');
        }

        attempts++;
      }

      throw new Error('Indexing timed out');
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
}));
