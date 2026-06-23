/**
 * Health-check worker — polls all live providers every `intervalMs`.
 *
 * If a provider goes offline, emits `provider:health_changed` with
 * `healthStatus: 'offline'`, which the eventBus → WSServer path forwards
 * to all connected clients (updating the provider chips in the Dashboard
 * left panel and the Platforms page in real-time).
 */

import type { ProviderRegistry } from '../provider-registry.js';
import type { ProviderId } from '../provider-registry.js';

export class HealthCheckWorker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(
    private registry: ProviderRegistry,
    private intervalMs = 30_000,
  ) {}

  start(): void {
    if (this.intervalId !== null) return;

    // Run immediately, then on interval
    void this.run().catch((err) =>
      console.error('[HealthCheck] initial run error:', err)
    );

    this.intervalId = setInterval(() => {
      if (this.destroyed) return;
      void this.run().catch((err) =>
        console.error('[HealthCheck] tick error:', err)
      );
    }, this.intervalMs);

    console.log(`[HealthCheck] started (interval ${this.intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.destroyed = true;
    console.log('[HealthCheck] stopped');
  }

  private async run(): Promise<void> {
    const ids = this.registry.listProviderIds();
    await Promise.allSettled(
      ids.map(async (id) => {
        const wasLive = this.registry.isLive(id);
        const state = await this.registry.refreshHealth(id as ProviderId);
        const isLive = state === 'live';

        // Only log state transitions to keep noise down
        if (wasLive !== isLive) {
          console.log(
            `[HealthCheck] ${id}: ${wasLive ? 'live→' : 'offline→'}${isLive ? 'live' : 'offline'}`
          );
        }
      })
    );
  }
}