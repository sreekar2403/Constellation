import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  rootPath: string | null;
  lastVisited: string[];
  setRootPath: (path: string) => void;
  clearRootPath: () => void;
  addRecentPath: (path: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      rootPath: null,
      lastVisited: [],

      setRootPath: (path) => {
        set({ rootPath: path });
        get().addRecentPath(path);
        localStorage.setItem('constellation-root-path', path);
      },

      clearRootPath: () => {
        set({ rootPath: null });
        localStorage.removeItem('constellation-root-path');
      },

      addRecentPath: (path) => {
        const { lastVisited } = get();
        const filtered = lastVisited.filter((p) => p !== path);
        set({ lastVisited: [path, ...filtered].slice(0, 10) });
      },
    }),
    {
      name: 'constellation-workspace',
    }
  )
);
