import { EventEmitter } from 'node:events';
import { buildGraph, Graph, IndexProgress } from './graph-builder.js';

export interface IndexerState {
  status: 'idle' | 'indexing' | 'ready' | 'error';
  progress: IndexProgress | null;
  graph: Graph | null;
  error: string | null;
  rootPath: string | null;
}

/**
 * Background indexer that builds the knowledge graph.
 * Emits events for progress updates.
 */
export class Indexer extends EventEmitter {
  private state: IndexerState = {
    status: 'idle',
    progress: null,
    graph: null,
    error: null,
    rootPath: null,
  };

  private abortController: AbortController | null = null;

  /**
   * Start indexing a directory.
   */
  async startIndexing(rootPath: string): Promise<void> {
    // Cancel any existing indexing
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    this.state = {
      status: 'indexing',
      progress: null,
      graph: null,
      error: null,
      rootPath,
    };

    this.emit('status', this.state);

    try {
      const graph = await buildGraph(rootPath, (progress) => {
        this.state.progress = progress;
        this.emit('progress', progress);
      });

      // Check if we were aborted
      if (this.abortController.signal.aborted) {
        return;
      }

      this.state = {
        status: 'ready',
        progress: null,
        graph,
        error: null,
        rootPath,
      };

      this.emit('status', this.state);
      this.emit('complete', graph);
    } catch (error) {
      if (this.abortController.signal.aborted) {
        return;
      }

      this.state = {
        status: 'error',
        progress: null,
        graph: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        rootPath,
      };

      this.emit('status', this.state);
      this.emit('error', error);
    }
  }

  /**
   * Stop current indexing.
   */
  stopIndexing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.state = {
      status: 'idle',
      progress: null,
      graph: null,
      error: null,
      rootPath: null,
    };

    this.emit('status', this.state);
  }

  /**
   * Get current state.
   */
  getState(): IndexerState {
    return { ...this.state };
  }

  /**
   * Get the built graph.
   */
  getGraph(): Graph | null {
    return this.state.graph;
  }
}

// Singleton instance
export const indexer = new Indexer();
