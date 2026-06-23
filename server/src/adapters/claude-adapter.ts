import type { AgentTool, AgentEvent } from '@constellation/shared';
import type { AgentAdapter, AgentAdapterConfig, QuestionMatch } from './types.js';

const QUESTION_PATTERNS = [
  // "Shall I ..." prompts
  /shall\s+I\s+.*\?/i,
  // "Do you want to continue?"
  /do\s+you\s+(want\s+to|wish\s+to)\s+.*\?/i,
  // "Allow Y/n" or "Proceed?"
  /(allow|proceed|continue)\??\s*\(.*\)/i,
  // "How would you like to proceed?"
  /how\s+would\s+you\s+like\s+to\s+proceed/i,
  // "Type your message" or "Send a prompt"
  /(type|send)\s+(a|your)\s+(message|prompt)/i,
  // "[y/N]" style prompts
  /\[(y|n|Y|N)\/(n|y|N|Y)\]/,
  // Yes/no questions
  /^(yes|no|continue|abort)\??\s*[>:]?\s*$/im,
  // "What would you like to do?"
  /what\s+would\s+you\s+like\s+to\s+do/i,
  // "Select an option"
  /select\s+an?\s+option/i,
];

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly tool: AgentTool = 'claude-code';
  readonly name = 'Claude Code';
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
        if (key === 'p' || key === 'print') {
          args.push('--print', value);
        } else if (key === 'allowedTools' || key === 'allowed-tools') {
          args.push('--allowedTools', value);
        } else if (key.length === 1) {
          args.push(`-${key}`, value);
        } else {
          args.push(`--${key}`, value);
        }
      }
    }

    return {
      binPath: 'claude.exe',
      cwd: config.cwd ?? process.cwd(),
      args,
      envVars: {},
    };
  }

  detectQuestion(output: string): QuestionMatch | null {
    const lines = output.split('\n').filter((l) => l.trim().length > 0);
    const lastFew = lines.slice(-10).join('\n');

    for (const pattern of QUESTION_PATTERNS) {
      const match = lastFew.match(pattern);
      if (match) {
        const contextBefore = lines.slice(-15, -5).join('\n');
        return {
          promptText: match[0],
          suggestedReplies: this.inferReplies(match[0]),
          rawTerminalContext: contextBefore,
        };
      }
    }

    return null;
  }

  getStartupMessage(agentId: string, name: string): AgentEvent {
    return {
      type: 'agent_message',
      agentId,
      payload: { text: `Claude Code agent "${name}" started` },
      timestamp: new Date().toISOString(),
    };
  }

  processOutput(output: string): string {
    // Remove ANSI escape codes
    return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }

  private inferReplies(question: string): string[] {
    const lower = question.toLowerCase();
    if (lower.includes('y/n') || lower.includes('[y/n]')) {
      return ['y', 'n'];
    }
    if (question.match(/\[.*?y.*?n.*?\]/i)) {
      const hasY = question.match(/\[.*?y.*?\]/i);
      const hasN = question.match(/\[.*?n.*?\]/i);
      const replies: string[] = [];
      if (hasY) replies.push(hasY[0].replace(/[\[\]]/g, '').trim());
      if (hasN) replies.push(hasN[0].replace(/[\[\]]/g, '').trim());
      if (replies.length > 0) return replies;
    }
    return ['Continue', 'No'];
  }
}
