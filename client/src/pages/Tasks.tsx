import React, { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskExecutionTrace } from '@/components/tasks/TaskExecutionTrace';
import type { Task } from '@constellation/shared';

export const Tasks: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <PageShell
      title="Task History"
      subtitle="Searchable archive of every task — with filters, table, and execution traces"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Main content: table with controls */}
        <div>
          <TaskTable onTaskSelect={setSelectedTask} />
        </div>

        {/* Sidebar: execution trace for selected task */}
        <div className="border rounded-lg p-4">
          <TaskExecutionTrace task={selectedTask} />
        </div>
      </div>
    </PageShell>
  );
};