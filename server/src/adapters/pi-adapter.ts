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
];

export class PiCliAdapter implements AgentAdapter {
  readonly tool: AgentTool = 'pi';
  readonly name = 'Pi AI CLI';
  readonly capabilities = {
    autonomous: true,
    parallel: true,
    customModels: false,
    maxConcurrent: 2,
  };

  buildConfig(config: {
    cwd?: string;
    model?: string;
    flags?: Record<string, string>;
    sessionId: string;
    agentId: string;
  }): AgentAdapterConfig {
    const args: string[] = ['run'];

    if (config.flags) {
      for (const [key, value] of Object.entries(config.flags)) {
        args.push(key.length === 1 ? `-${key}` : `--${key}`, value);
      }
    }

    return {
      binPath: 'pi',
      cwd: config.cwd ?? process.cwd(),
      args,
      envVars: {
        PI_SESSION: config.sessionId,
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
          suggestedReplies: match[0].toLowerCase().includes('[y/n]') ? ['y', 'n'] : ['Continue'],
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
      payload: { text: `Pi AI CLI agent "${name}" started` },
      timestamp: new Date().toISOString(),
    };
  }

  processOutput(output: string): string {
    return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }
}