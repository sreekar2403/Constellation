import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import type { AgentEvent, AgentConfig } from '@constellation/shared';
import { WS_MESSAGE_TYPES } from '@constellation/shared';
import { EventBus } from './event-bus.js';
import { SessionManager } from './session-manager.js';
import { ProcessManager } from './process-manager.js';

type WSMessage = {
  type: string;
  payload?: Record<string, unknown>;
};

export class WSServer {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();
  private logger: pino.Logger;

  constructor(
    port: number,
    private eventBus: EventBus,
    private sessionManager: SessionManager,
    private processManager: ProcessManager
  ) {
    this.logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      this.logger.info(`Client connected (${this.clients.size} total)`);

      // Send current state on connect
      this.sendSessionState(ws);

      ws.on('message', (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch {
          this.sendTo(ws, { type: 'error', payload: { message: 'Invalid JSON' } });
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.info(`Client disconnected (${this.clients.size} remaining)`);
      });

      ws.on('error', (err) => {
        this.logger.error({ err }, 'WebSocket error');
        this.clients.delete(ws);
      });
    });

    // Forward all events from event bus to all clients.
    // Two paths:
    //   (a) Legacy AgentEvents (type starts with 'agent_' — e.g. agent_spawned):
    //       wrap as { type: 'agent_event', payload: { event } } for backward
    //       compatibility with the existing client's `on('agent_event')` handler.
    //   (b) v3 events (task:*, provider:*, skill:*, pattern:*): pass through at
    //       their native type so the client can switch on them directly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventBus.on('*', (event: any) => {
      const eventType: string = event?.type ?? 'unknown';
      if (typeof eventType === 'string' && eventType.startsWith('agent_')) {
        this.broadcast({
          type: WS_MESSAGE_TYPES.AGENT_EVENT,
          payload: { event },
        });
      } else {
        this.broadcast({
          type: eventType,
          payload: event?.payload ?? event,
        });
      }
    });

    this.logger.info(`WebSocket server listening on port ${port}`);
  }

  private handleMessage(ws: WebSocket, message: WSMessage): void {
    const { type, payload } = message;

    switch (type) {
      case WS_MESSAGE_TYPES.START_AGENT: {
        const config = payload as unknown as AgentConfig;
        this.processManager.spawnAgent(config, (event) => {
          this.eventBus.emit(event.type, event);
        }).catch((err) => {
          this.sendTo(ws, { type: 'error', payload: { message: String(err) } });
        });
        break;
      }

      case WS_MESSAGE_TYPES.STOP_AGENT: {
        const { agentId } = (payload ?? {}) as Record<string, string>;
        if (agentId) {
          this.processManager.killAgent(agentId).catch(() => {});
        }
        break;
      }

      case 'agent_file_activity': {
        // Broadcast file activity to all clients for graph overlay
        const { agentId, filePath, action } = (payload ?? {}) as Record<string, string>;
        if (agentId && filePath) {
          this.broadcast({
            type: 'agent_file_activity',
            payload: { agentId, filePath, action },
          });
        }
        break;
      }

      case WS_MESSAGE_TYPES.SEND_INPUT: {
        const { agentId, text } = (payload ?? {}) as Record<string, string>;
        if (agentId && text) {
          try {
            this.processManager.sendInput(agentId, text);
          } catch (err) {
            this.sendTo(ws, { type: 'error', payload: { message: String(err) } });
          }
        }
        break;
      }

      case WS_MESSAGE_TYPES.CREATE_SESSION: {
        const config = payload as unknown as Omit<Parameters<SessionManager['createSession']>[0], 'id' | 'createdAt'>;
        const session = this.sessionManager.createSession(config);
        this.sendTo(ws, { type: WS_MESSAGE_TYPES.SESSION_STATE, payload: session });
        break;
      }

      case WS_MESSAGE_TYPES.SAVE_SESSION: {
        const json = this.sessionManager.saveToJSON();
        this.sendTo(ws, { type: 'session_saved', payload: { data: json } });
        break;
      }

      case WS_MESSAGE_TYPES.LOAD_SESSION: {
        const { data } = (payload ?? {}) as Record<string, string>;
        if (data) {
          this.sessionManager.loadFromJSON(data);
        }
        break;
      }

      case WS_MESSAGE_TYPES.LIST_SESSIONS: {
        const sessions = this.sessionManager.listSessions();
        this.sendTo(ws, { type: WS_MESSAGE_TYPES.SESSION_STATE, payload: { sessions } });
        break;
      }

      default:
        this.logger.warn({ type }, 'Unknown message type');
    }
  }

  private sendSessionState(ws: WebSocket): void {
    const sessions = this.sessionManager.listSessions();
    const agents = this.processManager.listAgents().map((h) => ({
      id: h.id,
      name: h.config.name,
      state: h.state,
      tool: h.config.tool,
    }));
    this.sendTo(ws, {
      type: WS_MESSAGE_TYPES.SESSION_STATE,
      payload: { sessions, agents },
    });
  }

  private sendTo(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  close(): void {
    this.wss.close();
  }
}
