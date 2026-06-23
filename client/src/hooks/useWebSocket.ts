import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketClient } from '../services/websocket-client';
import { useAgentStore } from '../store/useAgentStore';
import { useSessionStore } from '../store/useSessionStore';
import { useTaskStore } from '../store/useTaskStore';
import { useProviderStore } from '../store/useProviderStore';
import { useSkillStore } from '../store/useSkillStore';
import { usePatternStore } from '../store/usePatternStore';
import type { AgentEvent, SessionConfig } from '@constellation/shared';

let clientInstance: WebSocketClient | null = null;

function getClient(): WebSocketClient | null {
  return clientInstance;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Connect directly to the WebSocket server port (not through Vite proxy)
    const wsUrl = 'ws://localhost:3002';

    const client = new WebSocketClient(wsUrl);
    clientInstance = client;

    client.on('connected', () => {
      setConnected(true);
      useSessionStore.getState().setConnected(true);
    });

    client.on('disconnected', () => {
      setConnected(false);
      useSessionStore.getState().setConnected(false);
    });

    // ── v1 agent events (backward-compatible wrapper) ──────────────────────────
    client.on('agent_event', (payload: unknown) => {
      const event = (payload as { event?: AgentEvent })?.event;
      if (event) {
        useAgentStore.getState().handleEvent(event);
      }
    });

    // ── v3.0 task events ──────────────────────────────────────────────────────
    client.on('task:created', (payload) => {
      useTaskStore.getState().handleCreated(payload);
    });

    client.on('task:updated', (payload) => {
      useTaskStore.getState().handleUpdated(payload);
    });

    client.on('task:deleted', (payload) => {
      useTaskStore.getState().handleDeleted(payload);
    });

    // ── v3.0 provider events ──────────────────────────────────────────────────
    client.on('provider:connected', (payload) => {
      useProviderStore.getState().handleConnected(payload);
    });

    client.on('provider:disconnected', (payload) => {
      useProviderStore.getState().handleDisconnected(payload);
    });

    client.on('provider:health_changed', (payload) => {
      useProviderStore.getState().handleHealthChanged(payload);
    });

    // ── v3.0 skill events ──────────────────────────────────────────────────────
    client.on('skill:created', (payload) => {
      useSkillStore.getState().handleCreated(payload);
    });

    client.on('skill:triggered', (payload) => {
      useSkillStore.getState().handleTriggered(payload);
    });

    // ── v3.0 pattern events ───────────────────────────────────────────────────
    client.on('pattern:detected', (payload) => {
      usePatternStore.getState().handleDetected(payload);
    });

    // ── session state (existing) ───────────────────────────────────────────────
    client.on('session_state', (payload: unknown) => {
      const data = payload as { sessions?: SessionConfig[]; session?: SessionConfig };
      if (data.sessions) {
        useSessionStore.getState().setSessions(data.sessions);
      }
      if (data.session) {
        useSessionStore.getState().setCurrentSession(data.session);
      }
    });

    return () => {
      client.disconnect();
      clientInstance = null;
      initialized.current = false;
    };
  }, []);

  const sendMessage = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      getClient()?.send({ type, payload });
    },
    []
  );

  return { connected, sendMessage };
}