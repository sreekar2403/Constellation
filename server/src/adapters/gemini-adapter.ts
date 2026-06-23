import type { AgentTool, AgentEvent } from '@constellation/shared';
import type { AgentAdapter, AgentAdapterConfig, QuestionMatch } from './types.js';

const QUESTION_PATTERNS = [
  /Shall\s+I\s+.*\?/i,
  /\[y\/N\]/i,
  /Do\s+you\s+want\s+to\s+continue/i,
  /Select\s+an\s+option/i,
  /How\s+would\s+you\s+like\s+to\s+proceed/i,
];

export class GeminiCliAdapter implements AgentAdapter {
  readonly tool: AgentTool = 'gemini-cli';
  readonly name = 'Gemini CLI';
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

    // Gemini uses PowerShell wrapper, so we invoke via pwsh
    return {
      binPath: 'powershell.exe',
      cwd: config.cwd ?? process.cwd(),
      args: ['-ExecutionPolicy', 'Bypass', '-File', 'gemini.ps1', ...args],
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
          suggestedReplies: match[0].toLowerCase().includes('[y/n]')
            ? ['y', 'n']
            : ['Continue'],
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
      payload: { text: `Gemini CLI agent "${name}" started` },
      timestamp: new Date().toISOString(),
    };
  }

  processOutput(output: string): string {
    return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }
}
