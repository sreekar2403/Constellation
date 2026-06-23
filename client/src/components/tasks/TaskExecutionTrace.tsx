import React, { useEffect, useState } from 'react';
import type { Task, TaskObservation, ToolCallRecord } from '@constellation/shared';

interface TaskExecutionTraceProps {
  task: Task | null;
}

export const TaskExecutionTrace: React.FC<TaskExecutionTraceProps> = ({ task }) => {
  const [observation, setObservation] = useState<TaskObservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task || !task.observationId) {
      setObservation(null);
      return;
    }

    const fetchObservation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/task-observations/${task.observationId}`);
        if (!res.ok) throw new Error(`Failed to fetch observation: ${res.statusText}`);
        const data: TaskObservation = await res.json();
        setObservation(data);
      } catch (err) {
        setError(String(err));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchObservation();
  }, [task, task?.observationId]);

  if (loading) {
    return <div className="text-center py-8">Loading observation...</div>;
  }

  if (error) {
    return <div className="text-center text-error py-8">Error: {error}</div>;
  }

  if (!task) {
    return <div className="text-center py-8">Select a task to see its execution trace.</div>;
  }

  if (!observation) {
    return <div className="text-center py-8">No observation available for this task.</div>;
  }

  // We'll split the toolCalls into LLM calls and other tool calls
  const llmCalls = observation.toolCalls.filter((call) => call.kind === 'llm_call');
  const toolCalls = observation.toolCalls.filter((call) => call.kind !== 'llm_call');

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Task Execution Trace</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Task ID:</strong> {task.id}</div>
          <div><strong>Title:</strong> {task.title}</div>
          <div><strong>Status:</strong> {task.status}</div>
          <div><strong>Created:</strong> {new Date(task.createdAt).toLocaleString()}</div>
          {task.startedAt && (
            <div><strong>Started:</strong> {new Date(task.startedAt).toLocaleString()}</div>
          )}
          {task.completedAt && (
            <div><strong>Completed:</strong> {new Date(task.completedAt).toLocaleString()}</div>
          )}
          <div><strong>Duration:</strong> {observation.durationMs}ms</div>
          <div><strong>Tokens Used:</strong> {observation.tokensUsed}</div>
          <div><strong>Success:</strong> {observation.success ? 'Yes' : 'No'}</div>
        </div>
      </div>

      {llmCalls.length > 0 && (
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">LLM Calls ({llmCalls.length})</h2>
          <div className="space-y-3">
            {llmCalls.map((call, index) => (
              <div key={index} className="border rounded p-3">
                <div className="font-mono text-xs text-text-tertiary mb-1">
                  LLM Call #{index + 1}
                </div>
                <div className="whitespace-pre-wrap">{call.summary || 'No summary'}</div>
                {call.payloadShape && (
                  <div className="mt-2 text-xs bg-muted p-2 rounded">
                    <strong>Payload Shape:</strong>
                    <pre className="whitespace-pre-wrap text-xs m-1">{JSON.stringify(call.payloadShape, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {toolCalls.length > 0 && (
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Tool Calls ({toolCalls.length})</h2>
          <div className="space-y-3">
            {toolCalls.map((call, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {/* We can use an icon based on call.kind, but for simplicity we'll just show the kind */}
                    <span className="badge badge-outline">{call.kind}</span>
                  </div>
                  <div>
                    <div className="font-mono text-xs text-text-tertiary mb-1">
                      Tool Call #{index + 1}
                    </div>
                    <div className="whitespace-pre-wrap">{call.summary || 'No summary'}</div>
                    {call.payloadShape && (
                      <div className="mt-2 text-xs bg-muted p-2 rounded">
                        <strong>Payload Shape:</strong>
                        <pre className="whitespace-pre-wrap text-xs m-1">{JSON.stringify(call.payloadShape, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};