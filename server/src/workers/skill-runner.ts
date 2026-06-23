/**
 * SkillRunnerWorker — owns the lifecycle of Skills in two directions:
 *
 *   1. Genesis: consume patterns emitted by PatternDetectorWorker. If the
 *      pattern's success rate crosses the auto-threshold, crystallise it
 *      into a Skill immediately. Otherwise queue it for CEO review.
 *   2. Execution: when the dispatcher is about to dispatch a task, it calls
 *      `matchForTask(taskEmbedding, providerId)` to look up a Skill that
 *      matches. If found, the dispatcher can inject the skill steps into
 *      the worker's prompt and record the saving at completion.
 *
 * Together with the PatternDetectorWorker this implements the agent-OS
 * self-evolution loop:
 *
 *   observation -> pattern -> skill -> reuse
 */

import type { DetectedPattern, Skill, SkillStep, ToolCallRecord } from '@constellation/shared';
import { WS_V3_EVENTS } from '@constellation/shared';

import type { EventBus } from '../event-bus.js';
import { PatternStore, SkillStore, ObservationStore } from '../store/v3-stores.js';

export interface SkillMatch {
  skill: Skill;
  similarityScore: number;
}

interface RunnerConfig {
  /** Default similarity threshold used when a skill has no override */
  defaultSimilarityThreshold: number;
  /** Polling interval (ms) — only used for queued CEO review fallback */
  intervalMs: number;
}

const DEFAULT_CONFIG: RunnerConfig = {
  defaultSimilarityThreshold: 0.85,
  intervalMs: 5_000,
};

export class SkillRunnerWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private pendingCeoReview: DetectedPattern[] = [];
  private config: RunnerConfig;

  constructor(
    private skillStore: SkillStore,
    private patternStore: PatternStore,
    private observationStore: ObservationStore,
    private eventBus: EventBus,
    config: Partial<RunnerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => {
      if (this.destroyed) return;
      void this.tick().catch((err) => console.error('[SkillRunner] tick error:', err));
    }, this.config.intervalMs);
    console.log('[SkillRunner] started');
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.destroyed = true;
    console.log('[SkillRunner] stopped');
  }

  /**
   * Crystallise handler — wired into PatternDetectorWorker. Branches on
   * the pattern's success rate: auto if above the (caller-supplied) bar,
   * otherwise queues the pattern for CEO approval.
   */
  handleCrystallisationRequest(pattern: DetectedPattern, auto: boolean): void {
    if (auto) {
      const skill = this.crystallise(pattern);
      if (skill) {
        console.log(`[SkillRunner] auto-crystallised skill ${skill.id} from pattern ${pattern.id}`);
      }
    } else {
      this.pendingCeoReview.push(pattern);
      console.log(`[SkillRunner] pattern ${pattern.id} queued for CEO review (${this.pendingCeoReview.length} pending)`);
    }
  }

  /** Crystallise a pattern into a Skill. Returns the new Skill or undefined. */
  crystallise(pattern: DetectedPattern): Skill | undefined {
    const observations = pattern.observationIds
      .map((id) => this.observationStore.list().find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => !!o);

    if (observations.length === 0) return undefined;

    // Pick the dominant provider — most observations associated with it
    const providerCounts = new Map<string, number>();
    for (const o of observations) {
      providerCounts.set(o.providerId, (providerCounts.get(o.providerId) ?? 0) + 1);
    }
    let dominantProvider = '';
    let maxCount = 0;
    for (const [pid, count] of providerCounts) {
      if (count > maxCount) {
        dominantProvider = pid;
        maxCount = count;
      }
    }

    // Derive template steps from the most common tool-call sequence.
    // For each observation, take the first 3 tool calls and pick the
    // union of tool kinds in frequency order.
    const kindCounts = new Map<string, number>();
    for (const o of observations) {
      for (const call of o.toolCalls.slice(0, 3)) {
        kindCounts.set(call.kind, (kindCounts.get(call.kind) ?? 0) + 1);
      }
    }
    const sortedKinds = Array.from(kindCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([kind]) => kind as ToolCallRecord['kind']);

    const steps: SkillStep[] = sortedKinds.slice(0, 5).map((kind) => ({
      kind,
      payloadShape: {},
    }));

    const skill = this.skillStore.create({
      name: this.deriveSkillName(pattern, dominantProvider),
      description: `Crystallised from pattern ${pattern.id} (freq=${pattern.frequency}, success=${(pattern.successRate * 100).toFixed(0)}%)`,
      providerId: dominantProvider,
      triggerEmbedding: pattern.centroidEmbedding,
      similarityThreshold: this.config.defaultSimilarityThreshold,
      steps,
      sourcePatternId: pattern.id,
      generation: 1,
    });

    this.patternStore.update(pattern.id, { status: 'crystallised' });
    this.eventBus.emit(WS_V3_EVENTS.SKILL_CREATED, { skill, pattern });
    return skill;
  }

  /** Approve a pending pattern manually (called by CEO from the UI). */
  approvePending(patternId: string): Skill | undefined {
    const idx = this.pendingCeoReview.findIndex((p) => p.id === patternId);
    if (idx === -1) return undefined;
    const pattern = this.pendingCeoReview.splice(idx, 1)[0];
    const skill = this.crystallise(pattern);
    if (skill) {
      console.log(`[SkillRunner] CEO-approved pattern ${patternId} -> skill ${skill.id}`);
    }
    return skill;
  }

  /** Reject a pending pattern. */
  rejectPending(patternId: string): void {
    const idx = this.pendingCeoReview.findIndex((p) => p.id === patternId);
    if (idx === -1) return;
    const pattern = this.pendingCeoReview.splice(idx, 1)[0];
    this.patternStore.update(pattern.id, { status: 'rejected' });
    console.log(`[SkillRunner] CEO rejected pattern ${patternId}`);
  }

  /** List patterns waiting for CEO review. */
  listPendingReview(): DetectedPattern[] {
    return [...this.pendingCeoReview];
  }

  /**
   * Lookup: find the best-matching skill for an incoming task embedding.
   * Called by the dispatcher before spawning a worker. If a match is found
   * the dispatcher can attach the skill steps to the worker prompt and
   * record the savings on completion.
   */
  matchForTask(taskEmbedding: number[] | undefined, providerId?: string): SkillMatch | undefined {
    if (!taskEmbedding || taskEmbedding.length === 0) return undefined;
    const best = this.skillStore.findBestMatch(taskEmbedding, providerId);
    if (!best) return undefined;
    return { skill: best.skill, similarityScore: best.score };
  }

  /** Record that a skill fired for a task. */
  recordSkillFire(skillId: string, taskId: string, similarity: number, tokensSaved: number): void {
    this.skillStore.recordFire(skillId, taskId, similarity, tokensSaved);
  }

  /** Background tick — for now mostly used for stats emission. */
  private async tick(): Promise<void> {
    // Future: emit periodic WS heartbeat with skill + pattern counts.
  }

  /** Generate a human-readable name for a new skill. */
  private deriveSkillName(pattern: DetectedPattern, providerId: string): string {
    // v1: simple deterministic name. Future: derive from observation tool-call kinds.
    const shortProvider = providerId.split('-')[0] || providerId;
    return `${shortProvider}-pattern-${pattern.id.slice(0, 6)}`;
  }
}