/**
 * PatternDetectorWorker — scans recent observations, clusters them by embedding
 * similarity, and emits DetectedPattern records when a cluster reaches a
 * frequency threshold. Works in tandem with SkillGenesisWorker which decides
 * whether to auto-crystallise the pattern into a Skill or surface it to the CEO.
 *
 * v1: naive clustering by pairwise cosine similarity (O(n^2) but fine for
 * hundreds of observations). Future: replace with hierarchical clustering or
 * an LLM-assisted cluster naming step.
 */

import type { TaskObservation, DetectedPattern, PatternStatus } from '@constellation/shared';
import { WS_V3_EVENTS } from '@constellation/shared';

import type { EventBus } from '../event-bus.js';
import { ObservationStore, PatternStore } from '../store/v3-stores.js';

interface DetectorConfig {
  /** Cluster radius — observations with cosine similarity >= threshold cluster together */
  similarityThreshold: number;
  /** Minimum observations to form a pattern */
  minFrequency: number;
  /** Polling interval (ms) */
  intervalMs: number;
  /** Auto-crystallise threshold (success rate); below this → ask CEO */
  autoCrystalliseSuccessRate: number;
}

const DEFAULT_CONFIG: DetectorConfig = {
  similarityThreshold: 0.85,
  minFrequency: 5,
  intervalMs: 60_000, // 60s
  autoCrystalliseSuccessRate: 0.9,
};

export interface SkillCrystallisationRequest {
  pattern: DetectedPattern;
  /** True if auto-crystallise (success >= threshold), false if CEO-approval needed */
  auto: boolean;
}

export type SkillCrystallisationHandler = (req: SkillCrystallisationRequest) => void;

export class PatternDetectorWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private config: DetectorConfig;
  private crystalliseHandler: SkillCrystallisationHandler | undefined;

  constructor(
    private observationStore: ObservationStore,
    private patternStore: PatternStore,
    private eventBus: EventBus,
    config: Partial<DetectorConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Inject a handler to be invoked when a pattern becomes eligible for crystallisation. */
  onCrystallisationRequest(handler: SkillCrystallisationHandler): void {
    this.crystalliseHandler = handler;
  }

  start(): void {
    if (this.intervalId !== null) return;
    void this.run().catch((err) => console.error('[PatternDetector] initial run error:', err));
    this.intervalId = setInterval(() => {
      if (this.destroyed) return;
      void this.run().catch((err) => console.error('[PatternDetector] tick error:', err));
    }, this.config.intervalMs);
    console.log(`[PatternDetector] started (interval ${this.config.intervalMs}ms, threshold ${this.config.similarityThreshold})`);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.destroyed = true;
    console.log('[PatternDetector] stopped');
  }

  /** Public for tests and manual invocation. */
  async runOnce(): Promise<DetectedPattern[]> {
    return this.scan();
  }

  private async run(): Promise<void> {
    const patterns = await this.scan();
    if (patterns.length > 0) {
      console.log(`[PatternDetector] emitted ${patterns.length} new pattern(s)`);
    }
  }

  /**
   * Main scan loop: fetch recent observations, cluster by similarity, emit
   * patterns for clusters above the frequency threshold that are not already
   * represented in the pattern store.
   */
  private async scan(): Promise<DetectedPattern[]> {
    // Look at the last 24h of observations
    const sinceMs = 24 * 60 * 60 * 1000;
    const observations = this.observationStore.list({ sinceMs });

    // Filter to observations that have embeddings (we can't cluster those without)
    const embeddable = observations.filter((o) => o.taskEmbedding && o.taskEmbedding.length > 0);

    if (embeddable.length < this.config.minFrequency) {
      return [];
    }

    // Naive clustering: union-find by pairwise cosine similarity
    const clusters = this.clusterByEmbedding(embeddable, this.config.similarityThreshold);

    // Skip clusters smaller than minFrequency
    const significantClusters = clusters.filter((c) => c.length >= this.config.minFrequency);

    const emitted: DetectedPattern[] = [];

    // Get existing pattern centroids so we don't re-emit
    const existingPatterns = this.patternStore.list();
    const existingCentroids = existingPatterns
      .map((p) => p.centroidEmbedding)
      .filter((c): c is number[] => !!c);

    for (const cluster of significantClusters) {
      // Skip clusters we've already emitted a pattern for
      const centroid = averageEmbedding(cluster.map((o) => o.taskEmbedding!));
      if (existingCentroids.some((ec) => cosineSimilarity(ec, centroid) >= this.config.similarityThreshold)) {
        continue;
      }

      const successCount = cluster.filter((o) => o.success).length;
      const successRate = successCount / cluster.length;
      const totalTokens = cluster.reduce((sum, o) => sum + o.tokensUsed, 0);

      const status: PatternStatus = successRate >= this.config.autoCrystalliseSuccessRate ? 'pending-crystallisation' : 'observing';

      const pattern = this.patternStore.create({
        observationIds: cluster.map((o) => o.id),
        centroidEmbedding: centroid,
        frequency: cluster.length,
        avgTokens: Math.round(totalTokens / cluster.length),
        successRate,
        status,
      });

      emitted.push(pattern);

      // Fire WS event
      this.eventBus.emit(WS_V3_EVENTS.PATTERN_DETECTED, { pattern });

      // Notify the crystallisation handler (SkillGenesisWorker)
      if (this.crystalliseHandler) {
        const auto = status === 'pending-crystallisation';
        this.crystalliseHandler({ pattern, auto });
      }
    }

    return emitted;
  }

  /**
   * Union-find clustering — every observation starts in its own cluster;
   * merge any pair whose cosine similarity exceeds the threshold.
   */
  private clusterByEmbedding(observations: TaskObservation[], threshold: number): TaskObservation[][] {
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let root = x;
      while (parent.get(root) !== root) {
        const p = parent.get(root)!;
        parent.set(root, parent.get(p) ?? p);
        root = parent.get(p) ?? p;
      }
      return root;
    };
    const union = (x: string, y: string): void => {
      const rx = find(x);
      const ry = find(y);
      if (rx !== ry) parent.set(rx, ry);
    };

    // Init: each observation is its own parent
    for (const o of observations) parent.set(o.id, o.id);

    // O(n^2) pairwise similarity — fine for v1
    for (let i = 0; i < observations.length; i++) {
      for (let j = i + 1; j < observations.length; j++) {
        const sim = cosineSimilarity(observations[i].taskEmbedding!, observations[j].taskEmbedding!);
        if (sim >= threshold) {
          union(observations[i].id, observations[j].id);
        }
      }
    }

    // Group by root
    const groups = new Map<string, TaskObservation[]>();
    for (const o of observations) {
      const root = find(o.id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(o);
    }

    return Array.from(groups.values());
  }
}

/** Cosine similarity for two equal-length, non-zero vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Compute the centroid (mean) of a list of equal-length embeddings. */
function averageEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const out = new Array<number>(dim).fill(0);
  for (const e of embeddings) {
    for (let i = 0; i < dim; i++) out[i] += e[i];
  }
  for (let i = 0; i < dim; i++) out[i] /= embeddings.length;
  return out;
}