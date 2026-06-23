/**
 * useTaskStore — CEO Kanban task state.
 *
 * Hydrates from GET /api/tasks on first render.
 * Real-time updates via WebSocket events (task:created / task:updated / task:deleted).
 * Exposes REST-mutating actions that optimistically update local state.
 *
 * NOTE: never subscribe to Object.values(store) in a selector — the new-array
 * reference causes an infinite re-render loop in Zustand. Use the pattern:
 *   const raw = useTaskStore((s) => s.tasks);         // stable object ref
 *   const tasks = useMemo(() => Object.values(raw), [raw]); // stable array ref
 */
import { create } from 'zustand';
import type { Task, TaskStatus, TaskPriority } from '@constellation/shared';

interface TaskStore {
  tasks: Record<string, Task>;
  loading: boolean;
  error: string | null;

  // REST-mutating actions
  createTask: (input: {
    title: string;
    description: string;
    priority?: TaskPriority;
    platform?: string;
    model?: string;
    workspace: string;
  }) => Promise<Task>;

  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;

  // WebSocket event handlers (called by useWebSocket hook)
  handleCreated: (payload: unknown) => void;
  handleUpdated: (payload: unknown) => void;
  handleDeleted: (payload: unknown) => void;

  // Hydration
  hydrate: () => Promise<void>;

  // Internal mutation helpers (called optimistically before REST confirms)
  _applyTask: (task: Task) => void;
  _removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: {},
  loading: false,
  error: null,

  // ── Hydration ────────────────────────────────────────────────────────────────

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.statusText}`);
      const tasks: Task[] = await res.json();
      const map = Object.fromEntries(tasks.map((t) => [t.id, t]));
      set({ tasks: map, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  // ── Internal helpers ────────────────────────────────────────────────────────

  _applyTask: (task) =>
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } })),

  _removeTask: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.tasks;
      return { tasks: rest };
    }),

  // ── REST-mutating actions ───────────────────────────────────────────────────

  createTask: async ({ title, description, priority, platform, model, workspace }) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority, platform, model, workspace }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error ?? res.statusText);
    }
    const task: Task = await res.json();
    get()._applyTask(task);
    return task;
  },

  updateTask: async (id, updates) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error ?? res.statusText);
    }
    const task: Task = await res.json();
    get()._applyTask(task);
    return task;
  },

  deleteTask: async (id) => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete task ${id}: ${res.statusText}`);
    }
    get()._removeTask(id);
  },

  // ── WebSocket event handlers ────────────────────────────────────────────────
  // Called by useWebSocket hook. Payload shapes come from server v3-stores.ts.

  handleCreated: (payload) => {
    const data = (payload as { task?: Task })?.task;
    if (data?.id) get()._applyTask(data);
  },

  handleUpdated: (payload) => {
    const data = (payload as { task?: Task })?.task;
    if (data?.id) get()._applyTask(data);
  },

  handleDeleted: (payload) => {
    const data = (payload as { taskId?: string })?.taskId;
    if (data) get()._removeTask(data);
  },
}));