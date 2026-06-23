/**
 * useObservationStore — Debug/audit observation log (append-only).
 *
 * Hydrates from GET /api/observations on first render (with ?sinceMs=0).
 * NOT connected to WebSocket — observations are debug-only in v1.
 *
 * Keep observations list bounded to last 1000 entries to avoid memory bloat.
 */
import { create } from 'zustand';
import type { Observation } from '@constellation/shared';

interface ObservationStore {
  observations: Observation[];
  loading: boolean;
  error: string | null;

  hydrate: (sinceMs?: number) => Promise<void>;
  append: (obs: Observation) => void;
}

export const useObservationStore = create<ObservationStore>((set, get) => ({
  observations: [],
  loading: false,
  error: null,

  hydrate: async (sinceMs = 0) => {
    set({ loading: true, error: null });
    try {
      const url = sinceMs > 0 ? `/api/observations?sinceMs=${sinceMs}` : '/api/observations';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GET /api/observations failed: ${res.statusText}`);
      const observations: Observation[] = await res.json();
      // Prepend new observations, keep bounded to 1000
      set((s) => ({
        observations: [...observations, ...s.observations].slice(0, 1000),
        loading: false,
      }));
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  append: (obs) =>
    set((s) => ({ observations: [obs, ...s.observations].slice(0, 1000) })),
}));