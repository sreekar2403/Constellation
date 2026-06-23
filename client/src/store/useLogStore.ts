import { create } from 'zustand';

export interface LogEntry {
  id: string;
  agentId: string;
  agentName: string;
  text: string;
  level: 'info' | 'output' | 'error' | 'input' | 'system';
  timestamp: string;
}

export interface FileChangeEntry {
  id: string;
  agentId: string;
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: string;
}

export interface MemoryEntry {
  id: string;
  agentId: string;
  category: 'file' | 'pattern' | 'decision' | 'context';
  content: string;
  timestamp: string;
}

interface LogStore {
  logs: Record<string, LogEntry[]>; // agentId -> logs
  fileChanges: FileChangeEntry[];
  memories: MemoryEntry[];

  addLog: (entry: LogEntry) => void;
  addFileChange: (change: FileChangeEntry) => void;
  addMemory: (memory: MemoryEntry) => void;
  getLogsForAgent: (agentId: string) => LogEntry[];
  getAllLogsSorted: () => LogEntry[];
  reset: () => void;
}

let logCounter = 0;

export const useLogStore = create<LogStore>((set, get) => ({
  logs: {},
  fileChanges: [],
  memories: [],

  addLog: (entry) =>
    set((state) => {
      const existing = state.logs[entry.agentId] ?? [];
      return {
        logs: {
          ...state.logs,
          [entry.agentId]: [...existing, entry],
        },
      };
    }),

  addFileChange: (change) =>
    set((state) => ({
      fileChanges: [...state.fileChanges, change],
    })),

  addMemory: (memory) =>
    set((state) => ({
      memories: [...state.memories, memory],
    })),

  getLogsForAgent: (agentId) => {
    const state = get();
    return state.logs[agentId] ?? [];
  },

  getAllLogsSorted: () => {
    const state = get();
    return Object.values(state.logs)
      .flat()
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  },

  reset: () => set({ logs: {}, fileChanges: [], memories: [] }),
}));

/** Helper to create a log entry with auto-generated id */
export function createLogEntry(
  agentId: string,
  agentName: string,
  text: string,
  level: LogEntry['level'] = 'output'
): LogEntry {
  return {
    id: `log-${++logCounter}-${Date.now()}`,
    agentId,
    agentName,
    text,
    level,
    timestamp: new Date().toISOString(),
  };
}
