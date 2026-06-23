import type { AgentTool, AgentEvent } from '@constellation/shared';
import type { AgentAdapter, AgentAdapterConfig, QuestionMatch } from './types.js';

const QUESTION_PATTERNS = [
  /How\s+would\s+you\s+like\s+to\s+proceed/i,
  /shall\s+I\s+.*\?/i,
  /\[y\/N\]/i,
  /Select\s+an?\s+option/i,
  /What\s+would\s+you\s+like\s+to\s+do/i,
  /\[Yes\s*\/\s*No\]/i,
  /Accept\s+the\s+changes/i,
  /Run\s+this\s+command/i,
];

export class OpenCodeAdapter implements AgentAdapter {
  readonly tool: AgentTool = 'opencode';
  readonly name = 'OpenCode';
  readonly capabilities = {
    autonomous: true,
    parallel: true,
    customModels: false,
    maxConcurrent: 0,
  };

  buildConfig(config: {
    cwd?: string;
    model?: string;
    flags?: Record<string, string>;
    sessionId: string;
    agentId: string;
  }): AgentAdapterConfig {
    const args: string[] = [];

    if (config.model) {
      args.push('--model', config.model);
    }
    if (config.flags) {
      for (const [key, value] of Object.entries(config.flags)) {
        args.push(key.length === 1 ? `-${key}` : `--${key}`, value);
      }
    }

    // OpenCode is a PowerShell cmdlet, invoke via pwsh
    return {
      binPath: 'powershell.exe',
      cwd: config.cwd ?? process.cwd(),
      args: ['-ExecutionPolicy', 'Bypass', '-File', 'opencode.ps1', ...args],
      envVars: {},
    };
  }

  detectQuestion(output: string): QuestionMatch | null {
    const lines = output.split('\n').filter((l) => l.trim().length > 0);
    const lastFew = lines.slice(-8).join('\n');

    for (const pattern of QUESTION_PATTERNS) {
      const match = lastFew.match(pattern);
      if (match) {
        return {
          promptText: match[0],
          suggestedReplies: this.inferReplies(match[0]),
          rawTerminalContext: lines.slice(-12, -3).join('\n'),
        };
      }
    }

    return null;
  }

  getStartupMessage(agentId: string, name: string): AgentEvent {
    return {
      type: 'agent_message',
      agentId,
      payload: { text: `OpenCode agent "${name}" started` },
      timestamp: new Date().toISOString(),
    };
  }

  processOutput(output: string): string {
    return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }

  private inferReplies(question: string): string[] {
    if (question.match(/\[y\/N\]|\[Yes\s*\/\s*No\]/i)) {
      return ['y', 'n'];
    }
    return ['Continue', 'Cancel'];
  }
}
