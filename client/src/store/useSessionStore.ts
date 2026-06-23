import { create } from 'zustand';
import type { SessionConfig, TopologyMode } from '@constellation/shared';

const STORAGE_KEY = 'constellation-sessions';

function loadSessionsFromStorage(): SessionConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: SessionConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage may be full or unavailable
  }
}

interface SessionStore {
  currentSession: SessionConfig | null;
  sessions: SessionConfig[];
  isConnected: boolean;

  setCurrentSession: (session: SessionConfig) => void;
  setSessions: (sessions: SessionConfig[]) => void;
  setConnected: (connected: boolean) => void;
  updateTopology: (mode: TopologyMode) => void;
  createSession: (name: string) => SessionConfig;
  saveSession: () => void;
  deleteSession: (id: string) => void;
  loadSession: (id: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  currentSession: null,
  sessions: loadSessionsFromStorage(),
  isConnected: false,

  setCurrentSession: (session) => set({ currentSession: session }),

  setSessions: (sessions) => {
    set({ sessions });
    saveSessionsToStorage(sessions);
  },

  setConnected: (isConnected) => set({ isConnected }),

  updateTopology: (topology) => {
    const current = get().currentSession;
    if (current) {
      const updated = { ...current, topology };
      set({ currentSession: updated });
    }
  },

  createSession: (name) => {
    const session: SessionConfig = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      topology: 'hierarchical',
      agents: [],
      createdAt: new Date().toISOString(),
    };
    const { sessions } = get();
    const updated = [...sessions, session];
    set({ currentSession: session, sessions: updated });
    saveSessionsToStorage(updated);
    return session;
  },

  deleteSession: (id) => {
    const { currentSession, sessions } = get();
    const updated = sessions.filter((s) => s.id !== id);
    set({
      sessions: updated,
      currentSession: currentSession?.id === id ? null : currentSession,
    });
    saveSessionsToStorage(updated);
  },

  saveSession: () => {
    const { currentSession, sessions } = get();
    if (!currentSession) return;
    const existing = sessions.findIndex((s) => s.id === currentSession.id);
    let updated: SessionConfig[];
    if (existing >= 0) {
      updated = [...sessions];
      updated[existing] = currentSession;
    } else {
      updated = [...sessions, currentSession];
    }
    set({ sessions: updated });
    saveSessionsToStorage(updated);
  },

  loadSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (session) {
      set({ currentSession: session });
    }
  },

  reset: () => set({ currentSession: null }),
}));
