import type { AgentTool, AgentEvent } from '@constellation/shared';
import type { AgentAdapter, AgentAdapterConfig, QuestionMatch } from './types.js';

const QUESTION_PATTERNS = [
  /Send\s+a\s+message/i,
  />>>\s*$/m,
  /How\s+can\s+I\s+help/i,
  /\[y\/N\]/i,
  /Select\s+a\s+model/i,
  /Choose\s+a\s+model/i,
];

export class OllamaAdapter implements AgentAdapter {
  readonly tool: AgentTool = 'ollama';
  readonly name = 'Ollama';
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
    const model = config.model ?? 'qwen2.5-coder:7b';
    const args: string[] = ['run', model];

    if (config.flags?.keepAlive) {
      args.push('--keep-alive', config.flags.keepAlive);
    }
    if (config.flags?.verbose) {
      args.push('--verbose');
    }

    return {
      binPath: 'ollama.exe',
      cwd: config.cwd ?? process.cwd(),
      args,
      envVars: {
        OLLAMA_HOST: config.flags?.host ?? 'http://localhost:11434',
      },
    };
  }

  detectQuestion(output: string): QuestionMatch | null {
    const lines = output.split('\n').filter((l) => l.trim().length > 0);
    const lastFew = lines.slice(-5).join('\n');

    // Ollama shows ">>> " prompt when ready for input
    if (lastFew.includes('>>>')) {
      return {
        promptText: 'Ready for input',
        suggestedReplies: ['/help'],
        rawTerminalContext: lines.slice(-10).join('\n'),
      };
    }

    for (const pattern of QUESTION_PATTERNS) {
      const match = lastFew.match(pattern);
      if (match) {
        return {
          promptText: match[0],
          suggestedReplies: [],
          rawTerminalContext: lines.slice(-10).join('\n'),
        };
      }
    }

    return null;
  }

  getStartupMessage(agentId: string, name: string): AgentEvent {
    return {
      type: 'agent_message',
      agentId,
      payload: { text: `Ollama agent "${name}" started` },
      timestamp: new Date().toISOString(),
    };
  }

  processOutput(output: string): string {
    return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }
}
