import type { AgentEvent } from '@constellation/shared';

// BusEvent is the minimum contract every event satisfies.
// Specific event types (TaskEvent, ProviderEvent, etc.) extend this with their
// own fields. The `type` discriminator is what the wildcard listener in
// WSServer switches on.
export interface BusEvent {
  type: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

type EventCallback = (event: BusEvent) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners?.get(event)?.delete(callback);
  }

  emit(event: string, data: AgentEvent | BusEvent | Record<string, unknown>): void {
    // Normalise to { type, payload } shape.
    // - If data already has a `type`, use it as-is.
    // - Otherwise treat the data itself as the payload.
    const normalised: BusEvent =
      typeof data === 'object' && data !== null && 'type' in data
        ? (data as BusEvent)
        : { type: event, payload: data as Record<string, unknown> };

    // If the caller passed a raw event-name string (e.g. emit('task:created', { task })),
    // use the first arg as the type. This lets stores call:
    //   this.eventBus.emit('task:created', { task })
    // without manually constructing a BusEvent.
    if (!normalised.type || normalised.type === 'unknown') {
      normalised.type = event;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(normalised);
        } catch (err) {
          console.error(`EventBus error in listener for "${event}":`, err);
        }
      }
    }
    // Wildcard listeners receive the original event-type discriminator intact.
    const allCallbacks = this.listeners.get('*');
    if (allCallbacks) {
      for (const cb of allCallbacks) {
        try {
          cb(normalised);
        } catch (err) {
          console.error('EventBus error in wildcard listener:', err);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
