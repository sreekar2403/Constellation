import type { AgentTool, AgentEvent } from '@constellation/shared';
import type { AgentAdapter, AgentAdapterConfig, QuestionMatch } from './types.js';

const QUESTION_PATTERNS = [
  /Shall\s+I\s+.*\?/i,
  /\[y\/N\]/i,
  /\[Yes\s*\/\s*No\]/i,
  /do\s+you\s+(want|wish)\s+to\s+.*\?/i,
  /how\s+would\s+you\s+like\s+to\s+proceed/i,
  /what\s+would\s+you\s+like\s+to\s+do/i,
  /select\s+an?\s+option/i,
  /proceed\??\s*\(.*\)/i,
  /continue\??\s*$/im,
];

export class KimiCliAdapter implements AgentAdapter {
  readonly tool: AgentTool = 'kimi';
  readonly name = 'Kimi CLI';
  readonly capabilities = {
    autonomous: true,
    parallel: true,
    customModels: true,
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

    return {
      binPath: 'kimi',
      cwd: config.cwd ?? process.cwd(),
      args,
      envVars: {
        KIMI_SESSION: config.sessionId,
      },
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
      payload: { text: `Kimi CLI agent "${name}" started` },
      timestamp: new Date().toISOString(),
    };
  }

  processOutput(output: string): string {
    return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }

  private inferReplies(question: string): string[] {
    const lower = question.toLowerCase();
    if (lower.includes('[y/n]') || lower.includes('[yes/no]')) {
      return ['y', 'n'];
    }
    return ['Continue', 'Cancel'];
  }
}