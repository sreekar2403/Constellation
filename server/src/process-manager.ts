import * as pty from 'node-pty';
import * as os from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import type { AgentEvent, AgentConfig, AgentNode } from '@constellation/shared';
import type { AgentHandle } from './types.js';

const QUESTION_PATTERNS = [
  /\byes\/no\b/i,
  /\b(allow|deny)\b/i,
  /\b(proceed|continue)\?/i,
  /\bwhich\s+(file|option|one)\b/i,
  /\bchoose\b/i,
  /\bshall\s+I\b/i,
  /\?$/m,
];

function detectQuestion(text: string): { isQuestion: boolean; suggestedReplies: string[] } {
  const replies: string[] = [];
  let isQuestion = false;

  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(text)) {
      isQuestion = true;
      if (/\byes\/no\b/i.test(text) || /\b(y|n)\b/i.test(text)) {
        replies.push('y', 'n');
      }
      if (/\b(allow|deny)\b/i.test(text)) {
        replies.push('allow', 'deny');
      }
      break;
    }
  }

  return { isQuestion, suggestedReplies: [...new Set(replies)] };
}

export class ProcessManager {
  private agents = new Map<string, AgentHandle>();

  async spawnAgent(
    config: AgentConfig,
    onEvent: (event: AgentEvent) => void
  ): Promise<string> {
    const agentId = uuidv4();
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    const proc = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: config.workingDirectory,
      env: { ...process.env } as Record<string, string>,
    });

    const handle: AgentHandle = {
      id: agentId,
      process: proc,
      config,
      state: 'initializing',
      buffer: '',
      createdAt: new Date().toISOString(),
    };

    this.agents.set(agentId, handle);

    onEvent({
      type: 'agent_spawned',
      agentId,
      parentId: undefined,
      payload: { name: config.name, tool: config.tool, model: config.model },
      timestamp: new Date().toISOString(),
    });

    // Transition to idle
    handle.state = 'idle';
    this.emitStateChange(agentId, 'idle', onEvent);

    // Build command based on tool
    const command = this.buildCommand(config);

    // Write command to terminal
    proc.write(`${command}\r`);

    handle.state = 'executing';
    this.emitStateChange(agentId, 'executing', onEvent);

    proc.onData((data: string) => {
      handle.buffer += data;
      // Keep last 10000 chars
      if (handle.buffer.length > 10000) {
        handle.buffer = handle.buffer.slice(-5000);
      }

      const { isQuestion, suggestedReplies } = detectQuestion(data);
      if (isQuestion) {
        handle.state = 'waiting_for_input';
        this.emitStateChange(agentId, 'waiting_for_input', onEvent);
        onEvent({
          type: 'agent_question',
          agentId,
          payload: {
            promptText: data.trim().split('\n').slice(-5).join('\n'),
            suggestedReplies,
            rawTerminalContext: handle.buffer.split('\n').slice(-10).join('\n'),
          },
          timestamp: new Date().toISOString(),
        });
      }
    });

    proc.onExit(({ exitCode }) => {
      if (exitCode === 0) {
        handle.state = 'completed';
        this.emitStateChange(agentId, 'completed', onEvent);
        onEvent({
          type: 'agent_completed',
          agentId,
          payload: { exitCode },
          timestamp: new Date().toISOString(),
        });
      } else {
        handle.state = 'error';
        this.emitStateChange(agentId, 'error', onEvent);
        onEvent({
          type: 'agent_error',
          agentId,
          payload: { exitCode, message: `Process exited with code ${exitCode}` },
          timestamp: new Date().toISOString(),
        });
      }
      this.agents.delete(agentId);
    });

    return agentId;
  }

  sendInput(agentId: string, text: string): void {
    const handle = this.agents.get(agentId);
    if (!handle) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    handle.process.write(`${text}\r`);
    if (handle.state === 'waiting_for_input') {
      handle.state = 'executing';
    }
  }

  async killAgent(agentId: string): Promise<void> {
    const handle = this.agents.get(agentId);
    if (!handle) return;
    try {
      handle.process.kill();
    } catch {
      // Process may already be dead
    }
    this.agents.delete(agentId);
  }

  getAgentState(agentId: string): AgentNode['state'] | undefined {
    return this.agents.get(agentId)?.state;
  }

  listAgents(): AgentHandle[] {
    return Array.from(this.agents.values());
  }

  async killAll(): Promise<void> {
    const ids = Array.from(this.agents.keys());
    await Promise.all(ids.map((id) => this.killAgent(id)));
  }

  private buildCommand(config: AgentConfig): string {
    switch (config.tool) {
      case 'claude-code':
        return `claude ${config.flags?.permissionMode ? '--permission-mode ' + config.flags.permissionMode : ''}`.trim();
      case 'gemini-cli':
        return 'gemini';
      case 'opencode':
        return 'opencode';
      case 'ollama':
        return `ollama run ${config.model}`;
      default:
        return config.tool;
    }
  }

  private emitStateChange(
    agentId: string,
    state: AgentNode['state'],
    onEvent: (event: AgentEvent) => void
  ): void {
    onEvent({
      type: 'agent_state_changed',
      agentId,
      payload: { state },
      timestamp: new Date().toISOString(),
    });
  }
}
