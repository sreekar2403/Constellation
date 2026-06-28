import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationStore, PatternStore } from '../store/v3-stores.js';
import { PatternDetectorWorker } from '../workers/pattern-detector.js';
import type { TaskObservation } from '@constellation/shared';

// Simple mock EventBus that records emitted events
class MockEventBus {
  events: any[] = [];
  emit(event: any) {
    this.events.push(event);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (normA * normB);
}

describe('PatternDetectorWorker', () => {
  let obsStore: ObservationStore;
  let patStore: PatternStore;
  let bus: MockEventBus;
  let worker: PatternDetectorWorker;

  beforeEach(() => {
    bus = new MockEventBus();
    obsStore = new ObservationStore(bus as any);
    patStore = new PatternStore(bus as any, null);
    // Config: low minFrequency for test convenience
    worker = new PatternDetectorWorker(obsStore, patStore, bus as any, {
      minFrequency: 5,
      similarityThreshold: 0.8,
      intervalMs: 1000,
      autoCrystalliseSuccessRate: 0.9,
    });
  });

  it('detects a pattern when enough similar observations exist', async () => {
    const embedding = [0.2, 0.5, 0.3];
    // Create 5 observations with same embedding and success true
    for (let i = 0; i < 5; i++) {
      const obsInput = {
        taskId: `task${i}`,
        agentId: `agent${i}`,
        providerId: 'test',
        toolCalls: [],
        tokensUsed: 10,
        durationMs: 100,
        success: true,
        taskEmbedding: embedding,
      } as any;
      obsStore.append(obsInput);
    }

    const patterns = await worker.runOnce();
    console.log('bus events', bus.events);
    expect(patterns).toHaveLength(1);

    const pattern = patterns[0];
    expect(pattern.frequency).toBe(5);
    expect(pattern.successRate).toBeCloseTo(1);
    // Pattern should be stored in store
    const stored = patStore.get(pattern.id);
    expect(stored).toBeDefined();
    // EventBus should have emitted a pattern event
    const event = bus.events.find((e) => typeof e === 'string' && e.includes('detected'));
    expect(event).toBeDefined();


  });
});
