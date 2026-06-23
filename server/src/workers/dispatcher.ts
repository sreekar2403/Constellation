/**

 * Dispatcher worker — polls for backlog tasks, claims them,

 * routes to providers, and monitors execution.

 */

import type { Task, TaskStatus, TaskPriority } from '@constellation/shared';

import type { ProviderRegistry } from '../provider-registry.js';

import type { ProcessManager } from '../process-manager.js';

import type { EventBus } from '../event-bus.js';

import type { AgentAdapter } from '../adapters/types.js';

import { TaskStore, ObservationStore } from '../store/v3-stores.js';

import { WS_V3_EVENTS } from '@constellation/shared';

import type { SkillRunnerWorker } from './skill-runner.js';



export class DispatcherWorker {

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(
    private taskStore: TaskStore,
    private registry: ProviderRegistry,
    private processManager: ProcessManager,
    private eventBus: EventBus,
    private observationStore?: ObservationStore,
    private skillRunner?: SkillRunnerWorker,
    private intervalMs = 2_000, // poll every 2s
  ) {}

  start(): void {
    if (this.intervalId !== null) return;
    // Run immediately, then on interval
    void this.run().catch((err) =>
      console.error('[Dispatcher] initial run error:', err)
    );
    this.intervalId = setInterval(() => {
      if (this.destroyed) return;
      void this.run().catch((err) =>
        console.error('[Dispatcher] tick error:', err)
      );
    }, this.intervalMs);
    console.log(`[Dispatcher] started (interval ${this.intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.destroyed = true;
    console.log('[Dispatcher] stopped');
  }

  private async run(): Promise<void> {
    // Find tasks ready for dispatch (highest priority first)
    const readyTasks = this.taskStore.findReadyForDispatch(1); // we take one at a time
    if (readyTasks.length === 0) {
      return; // no tasks to dispatch
    }
    const task = readyTasks[0];
    console.log(`[Dispatcher] claiming task ${task.id}: ${task.title}`);
    // Claim the task by setting status to in-progress (or needs-clarification if vague)
    // We'll first check if the task is vague
    if (this.isVague(task)) {
      const clarification = this.generateClarification(task);
      const updated = this.taskStore.update(task.id, {
        status: 'needs-clarification',
        clarificationRequest: clarification,
      });
      if (updated) {
        console.log(`[Dispatcher] task ${task.id} needs clarification: ${clarification}`);
      }
      return;
    }
    // Not vague, proceed to dispatch
    // Select a provider
    const providerId = this.selectProvider(task);
    if (!providerId) {
      console.error(`[Dispatcher] no live provider available for task ${task.id}`);
      // We could set task to error? For now, just return and retry later.
      return;
    }
    // Get the adapter for the provider
    let adapter: AgentAdapter;
    try {
      adapter = this.registry.getAdapter(providerId);
    } catch (e) {
      console.error(`[Dispatcher] provider ${providerId} not live: ${e}`);
      return;
    }
    // Build agent config
    const agentId = `agent-${task.id}-${Date.now()}`;
    const sessionId = `session-${task.id}-${Date.now()}`;
    const config = adapter.buildConfig({
      cwd: task.workspace,
      model: task.model,
      flags: {}, // v1: no flags
      sessionId,
      agentId,
    });
    // Update task to in-progress and assign agent/provider
    const updated = this.taskStore.update(task.id, {
      status: 'in-progress',
      assignedAgentId: agentId,
      assignedProvider: providerId,
      progress: 0,
    });
    if (!updated) {
      console.error(`[Dispatcher] failed to update task ${task.id} to in-progress`);
      return;
    }
    console.log(`[Dispatcher] task ${task.id} dispatched to ${providerId} (agent ${agentId})`);

    // Consult SkillRunner for a matching skill (Phase 12.7)
    let skillHintId: string | undefined;
    if (this.skillRunner) {
      // Naive task embedding — use the task title hash as a pseudo-embedding
      // (v1 doesn't have full task embeddings). Skill runner will skip if invalid.
      const pseudoEmbedding = pseudoEmbeddingFromText(`${task.title} ${task.description}`);
      const match = this.skillRunner.matchForTask(pseudoEmbedding, providerId);
      if (match) {
        skillHintId = match.skill.id;
        console.log(
          `[Dispatcher] skill hint: ${match.skill.id} (similarity=${match.similarityScore.toFixed(2)})`
        );
      }
    }
    // Spawn the agent
    try {
      await this.processManager.spawnAgent(
        {
          tool: adapter.tool,
          model: task.model || '',
          name: `${adapter.name} ${agentId}`,
          workingDirectory: task.workspace,
          flags: {},
        },
        (event) => {
          // Handle agent events
          this.handleAgentEvent(event, task.id, agentId, providerId);
        }
      );
    } catch (e) {
      console.error(`[Dispatcher] failed to spawn agent for task ${task.id}: ${e}`);
      // Revert task to backlog? Or set to error? For now, set to backlog so it can be retried.
      this.taskStore.update(task.id, {
        status: 'backlog',
        assignedAgentId: undefined,
        assignedProvider: undefined,
      });
    }
  }

  private isVague(task: Task): boolean {
    // Simple heuristic: description too short (<10 words) or missing platform? Actually platform is always set (auto or specific).
    // We'll also consider if there is no clear deliverable? Hard to detect.
    const wordCount = task.description.trim().split(/\s+/).length;
    return wordCount < 10; // vague if less than 10 words
  }

  private generateClarification(task: Task): string {
    // Generate a clarification question based on the task
    // For v1, we can ask for more details.
    return `Can you provide more details about the task: "${task.title}"?`;
  }

  private selectProvider(task: Task): string | null {
    // If platform is specified and not 'auto', try to use that provider if live
    if (task.platform && task.platform !== 'auto') {
      if (this.registry.isLive(task.platform)) {
        return task.platform;
      }
      // else fall back to auto selection below
    }
    // Auto selection: we want to pick a provider based on capabilities inferred from task description
    const descriptionLower = task.description.toLowerCase();
    const needsCodeReview = descriptionLower.includes('review') || descriptionLower.includes('audit');
    const desiredCapability = needsCodeReview ? 'code-review' : 'code-edit';
    // Get live providers
    const liveIds = this.registry.listProviderIds().filter((id) => this.registry.isLive(id));
    if (liveIds.length === 0) {
      return null;
    }
    // Find a live provider that has the desired capability
    for (const id of liveIds) {
      const capabilities = this.registry.listProviderMeta().find((m) => m.id === id)?.capabilities || [];
      if (capabilities.includes(desiredCapability)) {
        return id;
      }
    }
    // If none, just pick the first live provider
    return liveIds[0];
  }

  private handleAgentEvent(
    event: { type: string; agentId: string; payload?: any; timestamp?: string },
    taskId: string,
    agentId: string,
    providerId: string
  ): void {
    switch (event.type) {
      case 'agent_question': {
        const question = event.payload?.prompt ?? 'Agent has a question.';
        const updated = this.taskStore.update(taskId, {
          status: 'needs-clarification',
          clarificationRequest: question,
        });
        if (updated) {
          console.log(`[Dispatcher] task ${taskId} needs clarification: ${question}`);
        }
        break;
      }
      case 'agent_completed': {
        const deliverable = event.payload?.deliverable ?? ''; // we might need to capture output from the agent
        const updated = this.taskStore.update(taskId, {
          status: 'review',
          deliverable: deliverable,
          progress: 100,
          completedAt: new Date().toISOString(),
        });
        if (updated) {
          console.log(`[Dispatcher] task ${taskId} completed, moving to review`);
          // Record observation for pattern detector
          if (this.observationStore) {
            this.observationStore.append({
              taskId,
              agentId,
              providerId,
              toolCalls: [
                { kind: 'tool_call', payloadShape: { deliverable } },
                { kind: 'llm_call', payloadShape: {} },
              ],
              tokensUsed: updated.tokensUsed ?? 0,
              durationMs: updated.startedAt
                ? Date.now() - new Date(updated.startedAt).getTime()
                : 0,
              success: true,
            });
          }
        }
        break;
      }
      case 'agent_error': {
        const error = event.payload?.error ?? 'Unknown error';
        console.error(`[Dispatcher] agent error for task ${taskId}: ${error}`);
        // We could set task to error, but for v1 we'll set back to backlog to retry?
        this.taskStore.update(taskId, {
          status: 'backlog',
          assignedAgentId: undefined,
          assignedProvider: undefined,
        });
        break;
      }
      case 'agent_state_changed': {
        // We could update progress based on state? Not now.
        break;
      }
      default:
        // ignore other events
        break;
    }
  }
}

/**
 * Deterministic pseudo-embedding for free-text. Produces a 64-dim vector
 * by hashing word n-grams into fixed buckets. Good enough for v1 skill
 * similarity when real embeddings aren't available; deterministic so the
 * same text always yields the same vector.
 */
function pseudoEmbeddingFromText(text: string, dim = 64): number[] {
  const out = new Array<number>(dim).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const h1 = simpleHash(w) % dim;
    const h2 = i > 0 ? simpleHash(tokens[i - 1] + ' ' + w) % dim : h1;
    out[h1] += 1;
    out[h2] += 0.5;
  }
  // L2 normalise
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
