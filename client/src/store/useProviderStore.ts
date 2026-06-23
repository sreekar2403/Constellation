/**
 * useProviderStore — Provider Registry state.
 *
 * Hydrates from GET /api/providers on first render.
 * WebSocket: provider:connected / provider:disconnected / provider:health_changed.
 */
import { create } from 'zustand';
import type { Provider, ProviderHealth, ProviderRegistration } from '@constellation/shared';

interface ProviderStore {
  providers: Record<string, Provider>;
  loading: boolean;
  error: string | null;

  // Model fetching
  models: Record<string, string[]>; // providerId -> model names
  modelLoading: Record<string, boolean>;

  hydrate: () => Promise<void>;
  register: (input: ProviderRegistration) => Promise<Provider>;
  updateHealth: (id: string, status: ProviderHealth) => Promise<Provider>;
  remove: (id: string) => Promise<void>;

  // New: fetch models for a provider
  fetchModels: (providerId: string) => Promise<string[]>;

  // WebSocket handlers
  handleConnected: (payload: unknown) => void;
  handleDisconnected: (payload: unknown) => void;
  handleHealthChanged: (payload: unknown) => void;

  _applyProvider: (p: Provider) => void;
  _removeProvider: (id: string) => void;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: {},
  loading: false,
  error: null,

  models: {},
  modelLoading: {},

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error(`GET /api/providers failed: ${res.statusText}`);
      const providers: Provider[] = await res.json();
      set({ providers: Object.fromEntries(providers.map((p) => [p.id, p])), loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  _applyProvider: (p) => {
    set((s) => ({ providers: { ...s.providers, [p.id]: p } }));
  },

  _removeProvider: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.providers;
      return { providers: rest };
    });
  },

  register: async (input) => {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error ?? res.statusText);
    }
    const provider: Provider = await res.json();
    get()._applyProvider(provider);
    return provider;
  },

  updateHealth: async (id, status) => {
    const res = await fetch(`/api/providers/${id}/health`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error ?? res.statusText);
    }
    const provider: Provider = await res.json();
    get()._applyProvider(provider);
    return provider;
  },

  remove: async (id) => {
    const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error(`DELETE /api/providers/${id} failed`);
    get()._removeProvider(id);
  },

  fetchModels: async (providerId) => {
    // Avoid duplicate requests
    if (get().modelLoading[providerId]) {
      return get().models[providerId] ?? [];
    }
    set((s) => ({
      modelLoading: { ...s.modelLoading, [providerId]: true },
    }));
    try {
      const res = await fetch(`/api/providers/${providerId}/models`);
      if (!res.ok) {
        // Some providers may not support model listing; treat as empty list
        return [];
      }
      const data = await res.json();
      // Expect { models: string[] } or just string[]
      const modelList: string[] = Array.isArray(data) ? data : data.models ?? [];
      set((s) => ({
        models: { ...s.models, [providerId]: modelList },
        modelLoading: { ...s.modelLoading, [providerId]: false },
      }));
      return modelList;
    } catch (err) {
      set((s) => ({
        modelLoading: { ...s.modelLoading, [providerId]: false },
      }));
      return [];
    }
  },

  /* WebSocket handlers — unchanged from before */
  handleConnected: (payload) => {
    const incoming = (payload as { provider?: Partial<import('@constellation/shared').ProviderConfig> })?.provider;
    if (!incoming?.id) return;
    const existing = get().providers[incoming.id];
    get()._applyProvider(existing ? { ...existing, ...incoming } : incoming as import('@constellation/shared').ProviderConfig);
  },

  handleDisconnected: (payload) => {
    const incoming = (payload as { provider?: Partial<import('@constellation/shared').ProviderConfig> })?.provider;
    if (!incoming?.id) return;
    const existing = get().providers[incoming.id];
    get()._applyProvider(existing ? { ...existing, ...incoming } as import('@constellation/shared').ProviderConfig : incoming as import('@constellation/shared').ProviderConfig);
  },

  handleHealthChanged: (payload) => {
    const incoming = (payload as { provider?: Partial<import('@constellation/shared').ProviderConfig> })?.provider;
    if (!incoming?.id) return;
    const existing = get().providers[incoming.id];
    get()._applyProvider(existing ? { ...existing, ...incoming } as import('@constellation/shared').ProviderConfig : incoming as import('@constellation/shared').ProviderConfig);
  },
}));