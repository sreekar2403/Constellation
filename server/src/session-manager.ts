import { v4 as uuidv4 } from 'uuid';
import type { SessionConfig, TopologyMode } from '@constellation/shared';

type PartialSession = Omit<SessionConfig, 'id' | 'createdAt'>;

export class SessionManager {
  private sessions = new Map<string, SessionConfig>();

  createSession(config: PartialSession): SessionConfig {
    const session: SessionConfig = {
      ...config,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): SessionConfig | undefined {
    return this.sessions.get(id);
  }

  listSessions(): SessionConfig[] {
    return Array.from(this.sessions.values());
  }

  updateSession(id: string, updates: Partial<SessionConfig>): SessionConfig {
    const existing = this.sessions.get(id);
    if (!existing) {
      throw new Error(`Session not found: ${id}`);
    }
    const updated = { ...existing, ...updates };
    this.sessions.set(id, updated);
    return updated;
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  saveToJSON(): string {
    return JSON.stringify(this.listSessions());
  }

  loadFromJSON(json: string): SessionConfig[] {
    const sessions: SessionConfig[] = JSON.parse(json);
    for (const s of sessions) {
      this.sessions.set(s.id, s);
    }
    return sessions;
  }
}
