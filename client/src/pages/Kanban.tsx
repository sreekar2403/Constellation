import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useTaskStore } from '../store/useTaskStore';
import { useProviderStore } from '../store/useProviderStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { Task, TaskStatus, TaskPriority, ProviderConfig } from '@constellation/shared';

const COLUMNS: readonly {
  id: TaskStatus;
  label: string;
  dot: string;
}[] = [
  { id: 'backlog', label: 'Backlog', dot: 'bg-slate-400' },
  { id: 'needs-clarification', label: 'Needs Clarification', dot: 'bg-amber-400' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-blue-400' },
  { id: 'review', label: 'Review', dot: 'bg-violet-400' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-400' },
];

const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
  const { updateTask } = useTaskStore();
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  const priorityLabel = {
    p0: 'P0',
    p1: 'P1',
    p2: 'P2',
  }[task.priority];

  return (
    <div
      data-id={task.id}
      role="button"
      tabIndex={0}
      className={`flex flex-col gap-2 p-4 bg-glass rounded-lg border border-border-primary ${isDragging ? 'opacity-50 pointer-events-none' : 'hover:bg-glass-elevated transition-colors cursor-grab'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${COLUMNS.find((c) => c.id === task.status)?.dot} shadow-sm`} />
          <span className="text-xs font-medium text-text-primary uppercase tracking-wider">
            {task.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] font-mono text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">
          {priorityLabel}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-text-primary line-clamp-2">
        {task.title}
      </h3>

      <p className="text-[11px] text-text-tertiary line-clamp-4">
        {task.description}
      </p>

      {task.model && (
        <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
          Model: {task.model}
        </div>
      )}

      <div className="mt-auto pt-2 flex items-center gap-2 text-[9px] font-mono text-text-tertiary">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.platform }} />
        Platform: {task.platform === 'auto' ? 'auto' : task.platform}
      </div>

      <DragOverlay>
        <div
          className="absolute inset-0 bg-gradient-to-br from-accent-primary to-accent-secondary/20 pointer-events-none opacity-0 transition-opacity drag-overlay:opacity-100"
        />
      </DragOverlay>
    </div>
  );
};

const KanbanColumn: React.FC<{ status: TaskStatus; tasks: Task[] }> = ({
  status,
  tasks,
}) => {
  const column = COLUMNS.find((c) => c.id === status);
  if (!column) return null;
  const { updateTask } = useTaskStore();
  const [draggableItems, setDraggableItems] = useState<
    Array<{ id: string; task: Task }>
  >([]);

  // Update draggableItems when tasks change
  React.useEffect(() => {
    setDraggableItems(tasks.map((task) => ({ id: task.id, task })));
  }, [tasks]);

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-lg bg-glass overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-primary">
        <span className={`h-2 w-2 rounded-full ${column.dot} shadow-sm`} />
        <span className="text-xs font-medium text-text-primary uppercase tracking-wider">
          {column.label}
        </span>
        <span className="ml-auto text-[10px] text-text-tertiary font-mono px-1.5 py-0.5 rounded bg-bg-tertiary">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        <DndContext
          sensors={[useSensor(PointerSensor), useSensor(KeyboardSensor)]}
          collisionDetection={closestCenter}
          onDragEnd={async (event) => {
            const { over, active } = event;
            if (!over) return;

            const activeId = active.id as string;
            const overId = over.id as string;

            if (activeId === overId) return;

            // Find the active task and over task (by id)
            const activeTask = draggableItems.find((i) => i.id === activeId)?.task;
            const overTask = draggableItems.find((i) => i.id === overId)?.task;

            if (!activeTask || !overTask) return;

            // Determine the new status based on the column we dropped into
            const newStatus = overTask.status;

            // If the status is the same, we are just reordering within the column.
            // We ignore reordering within column for simplicity.
            if (activeTask.status !== newStatus) {
              try {
                await updateTask(activeId, { status: newStatus });
              } catch (err) {
                console.error('Failed to update task status:', err);
                // Optimistic update would be undone by the error from the server?
                // We rely on the server to eventually correct the state via WS.
              }
            }
          }}
        >
          <SortableContext items={draggableItems} strategy={verticalListSortingStrategy}>
            {draggableItems.map(({ id, task }) => (
              <TaskItem key={id} task={task} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export const Kanban: React.FC = () => {
  const { tasks, loading, error, createTask, updateTask } = useTaskStore();
  const { providers } = useProviderStore();
  const { rootPath: workspace } = useWorkspaceStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Form state for the new task modal
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'p2' as TaskPriority,
    platform: 'auto' as string | 'auto',
    model: '',
    workspace: workspace ?? '',
  });

  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (form.platform === 'auto') {
      setModelOptions([]);
      setForm((f) => ({ ...f, model: '' }));
      return;
    }
    setLoadingModels(true);
    fetch(`/api/providers/${form.platform}/models`)
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.models ?? [];
        setModelOptions(list);
      })
      .finally(() => setLoadingModels(false));
  }, [form.platform]);

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    // Reset form
    setForm({
      title: '',
      description: '',
      priority: 'p2',
      platform: 'auto',
      model: '',
      workspace: workspace ?? '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        platform: form.platform,
        model: form.model,
        workspace: form.workspace,
      });
      alert('Task created successfully!');
      handleCloseModal();
    } catch (err) {
      alert('Failed to create task: ' + (err as Error)?.message);
      console.error('Failed to create task:', err);
    }
  };

  if (loading) {
    return (
      <PageShell
        title="CEO Kanban"
        subtitle="Loading tasks..."
      >
        <div className="flex items-center justify-center h-48">
          <span className="loading-spider" />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell
        title="CEO Kanban"
        subtitle="Error loading tasks"
      >
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <div className="text-red-400 text-sm">{error}</div>
          <button
            onClick={() => {
              // TODO: refetch
            }}
            className="px-4 h-8 rounded-md bg-glass-elevated border border-border-primary text-text-secondary text-xs hover:bg-glass hover:text-text-primary transition-colors"
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  // Group tasks by status
  const grouped: Record<TaskStatus, Task[]> = {
    backlog: [],
    'needs-clarification': [],
    'in-progress': [],
    review: [],
    done: [],
  };

  Object.values(tasks).forEach((task) => {
    if (task.status in grouped) {
      grouped[task.status].push(task);
    }
  });

  return (
    <PageShell
      title="CEO Kanban"
      subtitle="Drag tasks between columns to update status"
      action={
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-gradient-to-br from-accent-primary to-accent-secondary text-text-inverse text-xs font-semibold shadow-glow-cyan"
        >
          <Plus size={13} strokeWidth={2.5} />
          New Task
        </button>
      }
    >
      <div className="flex h-full gap-3 p-4 overflow-x-auto">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} status={col.id} tasks={grouped[col.id]} />
        ))}
      </div>

      {/* New Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-xl p-6 bg-glass rounded-lg border border-border-primary shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-text-primary">New Task</h2>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded hover:bg-glass-elevated"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1" htmlFor="priority">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="p0">P0 (Highest)</option>
                    <option value="p1">P1 (High)</option>
                    <option value="p2">P2 (Normal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1" htmlFor="platform">
                    Platform
                  </label>
                  <select
                    id="platform"
                    value={form.platform}
                    onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as string | 'auto' }))}
                    className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="auto">Auto (Dispatcher picks)</option>
                    {Object.values(providers).map((p: ProviderConfig) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1" htmlFor="model">
                  Model (optional)
                </label>
                <div className="relative">
                  <input
                    id="model"
                    list="model-options"
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  />
                  {loadingModels && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary"></span>
                  )}
                  <datalist id="model-options">
                    {modelOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1" htmlFor="workspace">
                  Workspace Folder
                </label>
                <input
                  id="workspace"
                  type="text"
                  value={form.workspace}
                  onChange={(e) => setForm((f) => ({ ...f, workspace: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 h-8 rounded-md border border-border-secondary text-text-secondary hover:bg-glass-elevated"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ml-2 px-4 h-8 rounded-md bg-gradient-to-br from-accent-primary to-accent-secondary text-text-inverse text-xs font-semibold shadow-glow-cyan"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};