import React, { useState, useMemo } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@constellation/shared';
import { useTaskStore } from '@/store/useTaskStore';
import { useShallow } from 'zustand/react/shallow';
import { Check, X } from 'lucide-react';

interface TaskTableProps {
  onTaskSelect: (task: Task | null) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({ onTaskSelect }) => {
  const { tasks, loading, error } = useTaskStore(useShallow(s => ({
    tasks: s.tasks,
    loading: s.loading,
    error: s.error,
  })));

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  // Convert tasks record to array
  const tasksArray = useMemo(() => Object.values(tasks), [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasksArray
      .filter((task) => {
        // Search in title and description
        const matchesSearch =
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filter
        const matchesStatus = !statusFilter || task.status === statusFilter;

        // Platform filter (platform is the provider id)
        const matchesPlatform = !platformFilter || task.platform === platformFilter;

        // Date range filter (on createdAt)
        const matchesDate = () => {
          const [start, end] = dateRange;
          if (!start && !end) return true;
          const created = new Date(task.createdAt);
          if (start && created < start) return false;
          if (end && created > end) return false;
          return true;
        };

        return matchesSearch && matchesStatus && matchesPlatform && matchesDate();
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first
  }, [tasksArray, searchTerm, statusFilter, platformFilter, dateRange]);

  // Handle row click to select task
  const handleSelect = (task: Task) => {
    onTaskSelect(task);
  };

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  if (error) {
    return <div className="text-center text-error py-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-bordered w-full"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus)}
            className="select select-bordered w-full"
          >
            <option value="">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Platform (provider ID)..."
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="input input-bordered w-full"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="date"
            value={dateRange[0] ? dateRange[0].toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const start = e.target.value ? new Date(e.target.value) : null;
              setDateRange([start, dateRange[1]]);
            }}
            className="input input-bordered w-full"
          />
          <span className="mx-2">to</span>
          <input
            type="date"
            value={dateRange[1] ? dateRange[1].toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const end = e.target.value ? new Date(e.target.value) : null;
              setDateRange([dateRange[0], end]);
            }}
            className="input input-bordered w-full"
          />
        </div>
        <div className="flex-1 min-w-[200px] flex items-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPlatformFilter('');
              setDateRange([null, null]);
            }}
            className="btn btn-outline"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Platform</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Tokens</th>
              <th>Skill</th>
              <th>Deliverable</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-4">
                  No tasks found.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  className="cursor-pointer hover:bg-accent-secondary/20"
                >
                  <td className="font-mono text-xs">{task.id.slice(0, 8)}...</td>
                  <td className="max-w-[200px] overflow-hidden text-ellipsis">
                    {task.title}
                  </td>
                  <td>
                    {task.platform ? (
                      <span className="badge badge-outline">{task.platform.slice(0, 12)}...</span>
                    ) : (
                      <span className="text-text-tertiary">-</span>
                    )}
                  </td>
                  <td>
                    {task.assignedAgentId ? (
                      <span className="badge badge-outline">{task.assignedAgentId.slice(0, 8)}...</span>
                    ) : (
                      <span className="text-text-tertiary">-</span>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(task.status)}>
                      {task.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right">
                    {task.startedAt && task.completedAt ? (
                      `${((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000).toFixed(1)}s`
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-right">{task.tokensUsed}</td>
                  <td className="text-center">
                    {task.skillFiredId ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <X className="size-4 text-error" />
                    )}
                  </td>
                  <td>
                    {task.deliverable ? (
                      <a
                        href={task.deliverable}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-secondary hover:underline"
                      >
                        Link
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-right text-text-tertiary text-sm">
        Showing {filteredTasks.length} of {tasksArray.length} tasks
      </div>
    </div>
  );
};

function getStatusBadgeClass(status: TaskStatus): string {
  const statusString = status as string;
  switch (statusString) {
    case 'backlog':
      return 'badge badge-ghost';
    case 'todo':
      return 'badge badge-outline';
    case 'in_progress':
      return 'badge badge-primary';
    case 'done':
      return 'badge badge-success';
    default:
      return 'badge badge-outline';
  }
}