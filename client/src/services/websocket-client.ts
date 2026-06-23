type EventCallback = (data: unknown) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private listeners = new Map<string, Set<EventCallback>>();
  private messageQueue: string[] = [];
  private _connected = false;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectAttempts = 0;
      this.flushQueue();
      this.emit('connected', null);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          this.emit('connected', data.payload);
          return;
        }
        this.emit('message', data);
        if (data.type === 'agent_event' || data.type === 'session_state') {
          this.emit(data.type, data.payload);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.emit('disconnected', null);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  send(message: object): void {
    const data = JSON.stringify(message);
    if (this._connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[WS] Error in listener for "${event}":`, err);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift();
      if (data && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(data);
      }
    }
  }
}
