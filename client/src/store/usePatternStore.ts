/**
 * usePatternStore — Pattern detector state (read + CEO approve/reject).
 *
 * Hydrates from GET /api/patterns and GET /api/patterns/pending.
 * WebSocket: pattern:detected.
 *
 * Patterns are crystallised into Skills either:
 *   - Automatically by the server when successRate >= threshold
 *   - Manually by the CEO via the Skills page approve/reject buttons
 */
import { create } from 'zustand';
import type { Pattern, DetectedPattern } from '@constellation/shared';

interface PatternStoreState {
  patterns: Record<string, Pattern>;
  pendingReview: DetectedPattern[];
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  hydratePending: () => Promise<void>;

  approve: (patternId: string) => Promise<void>;
  reject: (patternId: string) => Promise<void>;
  triggerDetect: () => Promise<number>;

  handleDetected: (payload: unknown) => void;
  _applyPattern: (pattern: Pattern) => void;
}

export const usePatternStore = create<PatternStoreState>((set, get) => ({
  patterns: {},
  pendingReview: [],
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/patterns');
      if (!res.ok) throw new Error(`GET /api/patterns failed: ${res.statusText}`);
      const patterns: Pattern[] = await res.json();
      set({
        patterns: Object.fromEntries(patterns.map((p) => [p.id, p])),
        loading: false,
      });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  hydratePending: async () => {
    try {
      const res = await fetch('/api/patterns/pending');
      if (!res.ok) throw new Error(`GET /api/patterns/pending failed: ${res.statusText}`);
      const pending: DetectedPattern[] = await res.json();
      set({ pendingReview: pending });
    } catch (err) {
      console.error('hydratePending failed:', err);
    }
  },

  approve: async (patternId: string) => {
    const res = await fetch(`/api/patterns/${patternId}/approve`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Approve failed: ${res.statusText}`);
    }
    // Optimistically remove from pending — the WS event will deliver the new skill
    set((s) => ({ pendingReview: s.pendingReview.filter((p) => p.id !== patternId) }));
  },

  reject: async (patternId: string) => {
    const res = await fetch(`/api/patterns/${patternId}/reject`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Reject failed: ${res.statusText}`);
    }
    set((s) => ({ pendingReview: s.pendingReview.filter((p) => p.id !== patternId) }));
  },

  triggerDetect: async () => {
    const res = await fetch('/api/patterns/detect', { method: 'POST' });
    if (!res.ok) throw new Error(`Detect failed: ${res.statusText}`);
    const body = await res.json();
    return body.detected as number;
  },

  _applyPattern: (pattern) =>
    set((s) => ({ patterns: { ...s.patterns, [pattern.id]: pattern } })),

  handleDetected: (payload) => {
    const data = (payload as { pattern?: Pattern })?.pattern;
    if (data?.id) get()._applyPattern(data);
  },
}));