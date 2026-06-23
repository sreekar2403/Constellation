/**
 * v3.0 In-memory stores for the Agent OS data model.
 *
 * Five stores:
 *   - TaskStore        — CEO Kanban tasks
 *   - ProviderStore    — Provider Registry
 *   - SkillStore       — Reusable Skills (self-evolution)
 *   - PatternStore     — Detected patterns (pre-Skill)
 *   - ObservationStore — Append-only task observations (raw input for patterns)
 *
 * All in-memory for v1. v2 swaps the Map for SQLite without changing the
 * public API (create / get / list / update / delete).
 *
 * Every mutation that other systems might care about goes through
 * `eventBus.emit()` so the WebSocket layer can broadcast it to clients.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../event-bus.js';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  ProviderConfig,
  ProviderHealth,
  Skill,
  SkillStatus,
  SkillTrigger,
  DetectedPattern,
  PatternStatus,
  TaskObservation,
  SystemStats,
} from '@constellation/shared';
import { WS_V3_EVENTS } from '@constellation/shared';

/* --------------------------------------------------------------------------
 * TaskStore
 * -------------------------------------------------------------------------- */

export class TaskStore {
  private tasks = new Map<string, Task>();
  constructor(private eventBus: EventBus) {}

  create(input: {
    title: string;
    description: string;
    priority?: TaskPriority;
    platform?: string | 'auto';
    model?: string;
    workspace: string;
  }): Task {
    const task: Task = {
      id: uuidv4(),
      title: input.title,
      description: input.description,
      status: 'backlog',
      priority: input.priority ?? 'p1',
      platform: input.platform ?? 'auto',
      model: input.model,
      workspace: input.workspace,
      progress: 0,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    this.eventBus.emit(WS_V3_EVENTS.TASK_CREATED, { task });
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(filter?: { status?: TaskStatus; priority?: TaskPriority }): Task[] {
    let arr = Array.from(this.tasks.values());
    if (filter?.status) arr = arr.filter((t) => t.status === filter.status);
    if (filter?.priority) arr = arr.filter((t) => t.priority === filter.priority);
    // newest first
    return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(id: string, updates: Partial<Task>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, id: existing.id };
    this.tasks.set(id, updated);

    // Emit a typed event for the relevant state transitions
    if (updates.status && updates.status !== existing.status) {
      switch (updates.status) {
        case 'needs-clarification':
          this.eventBus.emit(WS_V3_EVENTS.TASK_NEEDS_CLARIFICATION, { task: updated });
          break;
        case 'in-progress':
          this.eventBus.emit(WS_V3_EVENTS.TASK_DISPATCHED, { task: updated });
          break;
        case 'review':
          this.eventBus.emit(WS_V3_EVENTS.TASK_REVIEW, { task: updated });
          break;
        case 'done':
          this.eventBus.emit(WS_V3_EVENTS.TASK_APPROVED, { task: updated });
          break;
      }
    }

    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  /** Find tasks ready for the dispatcher to claim (highest priority first). */
  findReadyForDispatch(limit = 5): Task[] {
    const PRIORITY_WEIGHT: Record<TaskPriority, number> = { p0: 0, p1: 1, p2: 2 };
    return this.list({ status: 'backlog' })
      .sort(
        (a, b) =>
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
          a.createdAt.localeCompare(b.createdAt),
      )
      .slice(0, limit);
  }
}

/* --------------------------------------------------------------------------
 * ProviderStore
 * -------------------------------------------------------------------------- */

export class ProviderStore {
  private providers = new Map<string, ProviderConfig>();
  constructor(private eventBus: EventBus) {}

  register(config: Omit<ProviderConfig, 'registeredAt' | 'healthStatus'>): ProviderConfig {
    const full: ProviderConfig = {
      ...config,
      registeredAt: new Date().toISOString(),
      healthStatus: 'idle',
    };
    this.providers.set(full.id, full);
    this.eventBus.emit(WS_V3_EVENTS.PROVIDER_CONNECTED, { provider: full });
    return full;
  }

  get(id: string): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  list(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  updateHealth(id: string, status: ProviderHealth): ProviderConfig | undefined {
    const existing = this.providers.get(id);
    if (!existing) return undefined;
    const updated: ProviderConfig = {
      ...existing,
      healthStatus: status,
      lastHealthCheckAt: new Date().toISOString(),
    };
    this.providers.set(id, updated);

    if (status === 'offline') {
      this.eventBus.emit(WS_V3_EVENTS.PROVIDER_DISCONNECTED, { provider: updated });
    } else if (status === 'live') {
      this.eventBus.emit(WS_V3_EVENTS.PROVIDER_CONNECTED, { provider: updated });
    }

    return updated;
  }

  delete(id: string): boolean {
    return this.providers.delete(id);
  }
}

/* --------------------------------------------------------------------------
 * SkillStore
 * -------------------------------------------------------------------------- */

export class SkillStore {
  private skills = new Map<string, Skill>();
  private triggers: SkillTrigger[] = [];
  constructor(private eventBus: EventBus) {}

  create(input: Omit<Skill, 'id' | 'createdAt' | 'usageCount' | 'totalTokensSaved' | 'status'>): Skill {
    const skill: Skill = {
      ...input,
      id: uuidv4(),
      status: 'active',
      usageCount: 0,
      totalTokensSaved: 0,
      createdAt: new Date().toISOString(),
    };
    this.skills.set(skill.id, skill);
    this.eventBus.emit(WS_V3_EVENTS.SKILL_CREATED, { skill });
    return skill;
  }

  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  list(filter?: { providerId?: string; status?: SkillStatus }): Skill[] {
    let arr = Array.from(this.skills.values());
    if (filter?.providerId) arr = arr.filter((s) => s.providerId === filter.providerId);
    if (filter?.status) arr = arr.filter((s) => s.status === filter.status);
    return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Mark a skill as fired for a task; returns the SkillTrigger record. */
  recordFire(
    skillId: string,
    matchedTaskId: string,
    similarityScore: number,
    tokensSaved: number,
  ): SkillTrigger | undefined {
    const skill = this.skills.get(skillId);
    if (!skill) return undefined;
    skill.usageCount += 1;
    skill.totalTokensSaved += tokensSaved;
    skill.lastFiredAt = new Date().toISOString();
    this.skills.set(skillId, skill);

    const trigger: SkillTrigger = {
      id: uuidv4(),
      skillId,
      matchedTaskId,
      similarityScore,
      tokensSaved,
      timestamp: new Date().toISOString(),
    };
    this.triggers.push(trigger);
    this.eventBus.emit(WS_V3_EVENTS.SKILL_TRIGGERED, { trigger, skill });
    return trigger;
  }

  archive(id: string): Skill | undefined {
    const existing = this.skills.get(id);
    if (!existing) return undefined;
    const updated: Skill = { ...existing, status: 'archived' };
    this.skills.set(id, updated);
    return updated;
  }

  /** Lookup: find the best-matching skill for an incoming task embedding. */
  findBestMatch(
    embedding: number[],
    providerId?: string,
    threshold = 0.85,
  ): { skill: Skill; score: number } | undefined {
    let best: { skill: Skill; score: number } | undefined;
    for (const skill of this.skills.values()) {
      if (skill.status !== 'active') continue;
      if (providerId && skill.providerId !== providerId) continue;
      if (!skill.triggerEmbedding) continue;
      const score = cosineSimilarity(embedding, skill.triggerEmbedding);
      if (score >= threshold && (!best || score > best.score)) {
        best = { skill, score };
      }
    }
    return best;
  }

  /** Trigger history, newest first. */
  listTriggers(limit = 100): SkillTrigger[] {
    return [...this.triggers].reverse().slice(0, limit);
  }
}

/** Cheap cosine similarity — assumes equal-length, non-zero vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/* --------------------------------------------------------------------------
 * PatternStore
 * -------------------------------------------------------------------------- */

export class PatternStore {
  private patterns = new Map<string, DetectedPattern>();
  constructor(private eventBus: EventBus) {}

  create(input: Omit<DetectedPattern, 'id' | 'detectedAt'>): DetectedPattern {
    const pattern: DetectedPattern = {
      ...input,
      id: uuidv4(),
      detectedAt: new Date().toISOString(),
    };
    this.patterns.set(pattern.id, pattern);
    this.eventBus.emit(WS_V3_EVENTS.PATTERN_DETECTED, { pattern });
    return pattern;
  }

  get(id: string): DetectedPattern | undefined {
    return this.patterns.get(id);
  }

  list(filter?: { status?: PatternStatus }): DetectedPattern[] {
    let arr = Array.from(this.patterns.values());
    if (filter?.status) arr = arr.filter((p) => p.status === filter.status);
    return arr.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  update(id: string, updates: Partial<DetectedPattern>): DetectedPattern | undefined {
    const existing = this.patterns.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, id: existing.id };
    this.patterns.set(id, updated);
    return updated;
  }
}

/* --------------------------------------------------------------------------
 * ObservationStore (append-only)
 * -------------------------------------------------------------------------- */

export class ObservationStore {
  private observations: TaskObservation[] = [];
  constructor(private eventBus: EventBus) {}

  append(input: Omit<TaskObservation, 'id' | 'createdAt'>): TaskObservation {
    const obs: TaskObservation = {
      ...input,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.observations.push(obs);
    return obs;
  }

  list(filter?: { providerId?: string; success?: boolean; sinceMs?: number }): TaskObservation[] {
    let arr = [...this.observations];
    if (filter?.providerId) arr = arr.filter((o) => o.providerId === filter.providerId);
    if (filter?.success !== undefined) arr = arr.filter((o) => o.success === filter.success);
    if (filter?.sinceMs !== undefined) {
      const cutoff = Date.now() - filter.sinceMs;
      arr = arr.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    }
    return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): TaskObservation | undefined {
    return this.observations.find((o) => o.id === id);
  }
}

/* --------------------------------------------------------------------------
 * Aggregated stats helper — used by the Dashboard KPI strip via REST.
 * -------------------------------------------------------------------------- */

export function computeSystemStats(
  tasks: TaskStore,
  providers: ProviderStore,
  skills: SkillStore,
  activeAgentsFn: () => number,
): SystemStats {
  const taskList = tasks.list();
  const providerList = providers.list();
  const skillList = skills.list();
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentTriggers = skills
    .listTriggers(1000)
    .filter((t) => new Date(t.timestamp).getTime() >= since24h);

  return {
    totalTasks: taskList.length,
    activeTasks: taskList.filter((t) => t.status === 'in-progress').length,
    completedTasks: taskList.filter((t) => t.status === 'done').length,
    totalTokensUsed: taskList.reduce((sum, t) => sum + t.tokensUsed, 0),
    totalTokensSaved: skillList.reduce((sum, s) => sum + s.totalTokensSaved, 0),
    activeAgents: activeAgentsFn(),
    liveProviders: providerList.filter((p) => p.healthStatus === 'live').length,
    totalProviders: providerList.length,
    totalSkills: skillList.filter((s) => s.status === 'active').length,
    skillsFiredToday: recentTriggers.length,
  };
}
