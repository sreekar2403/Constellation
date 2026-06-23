import type { AgentTool, AgentEvent } from '@constellation/shared';

export interface AgentAdapterConfig {
  /** Path to the CLI binary/script */
  binPath: string;
  /** Working directory for the agent */
  cwd: string;
  /** Initial CLI args */
  args: string[];
  /** Environment variables to set */
  envVars: Record<string, string>;
}

export interface AdapterCapabilities {
  /** Whether this adapter supports autonomous mode (no intervention needed) */
  autonomous: boolean;
  /** Whether this adapter can be run in parallel */
  parallel: boolean;
  /** Whether this adapter supports custom models */
  customModels: boolean;
  /** Max concurrent instances (0 = unlimited) */
  maxConcurrent: number;
}

export type QuestionDetectionFn = (
  output: string
) => QuestionMatch | null;

export interface QuestionMatch {
  /** The text of the question/prompt */
  promptText: string;
  /** Suggested replies (auto-detected options) */
  suggestedReplies: string[];
  /** The raw terminal context */
  rawTerminalContext: string;
}

/**
 * Adapter interface for each CLI agent tool.
 * Each adapter knows how to start, detect questions, and interact
 * with its specific CLI tool.
 */
export interface AgentAdapter {
  /** Unique identifier matching AgentTool type */
  readonly tool: AgentTool;

  /** Human-readable display name */
  readonly name: string;

  /** Capabilities of this adapter */
  readonly capabilities: AdapterCapabilities;

  /**
   * Build the initial configuration for spawning this agent.
   * @param config Agent configuration from the session
   * @returns Spawn configuration for the process manager
   */
  buildConfig(config: {
    cwd?: string;
    model?: string;
    flags?: Record<string, string>;
    sessionId: string;
    agentId: string;
  }): AgentAdapterConfig;

  /**
   * Detect if the agent is waiting for input.
   * Returns null if no question detected, or the question details.
   */
  detectQuestion: QuestionDetectionFn;

  /**
   * Get the startup message to send as the first event.
   */
  getStartupMessage(agentId: string, name: string): AgentEvent;

  /**
   * Handle output before it's emitted - allows filtering/transforming.
   */
  processOutput(output: string): string;
}
