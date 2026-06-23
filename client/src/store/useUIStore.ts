import { create } from 'zustand';

interface UIStore {
  selectedAgentId: string | null;
  selectedProviderId: string | null;
  activePanel: 'terminal' | 'code' | 'files' | 'memory' | 'chat' | null;
  panelMode: 'all' | 'selected';
  showFallback: boolean;

  selectAgent: (agentId: string | null) => void;
  selectProvider: (providerId: string | null) => void;
  setActivePanel: (panel: UIStore['activePanel']) => void;
  setPanelMode: (mode: UIStore['panelMode']) => void;
  setShowFallback: (show: boolean) => void;
  reset: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedAgentId: null,
  selectedProviderId: null,
  activePanel: null,
  panelMode: 'all',
  showFallback: false,

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),

  selectProvider: (providerId) => set({ selectedProviderId: providerId }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setPanelMode: (panelMode) => set({ panelMode }),

  setShowFallback: (showFallback) => set({ showFallback }),

  reset: () =>
    set({
      selectedAgentId: null,
      selectedProviderId: null,
      activePanel: null,
      panelMode: 'all',
    }),
}));