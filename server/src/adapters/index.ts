import type { AgentTool } from '@constellation/shared';
import type { AgentAdapter, AdapterCapabilities } from './types.js';
import { ClaudeCodeAdapter } from './claude-adapter.js';
import { GeminiCliAdapter } from './gemini-adapter.js';
import { OpenCodeAdapter } from './opencode-adapter.js';
import { OllamaAdapter } from './ollama-adapter.js';
import { HermesAdapter } from './hermes-adapter.js';
import { PiCliAdapter } from './pi-adapter.js';
import { KimiCliAdapter } from './kimi-adapter.js';

// Singleton instances
const adapters = new Map<AgentTool, AgentAdapter>();

function register(adapter: AgentAdapter): void {
  adapters.set(adapter.tool, adapter);
}

// Register all built-in adapters
register(new ClaudeCodeAdapter());
register(new GeminiCliAdapter());
register(new OpenCodeAdapter());
register(new OllamaAdapter());
register(new HermesAdapter());
register(new PiCliAdapter());
register(new KimiCliAdapter());

/**
 * Get the adapter for a specific tool type.
 */
export function getAdapter(tool: AgentTool): AgentAdapter {
  const adapter = adapters.get(tool);
  if (!adapter) {
    throw new Error(`No adapter registered for tool: ${tool}`);
  }
  return adapter;
}

/**
 * List all registered adapters with their capabilities.
 */
export function listAdapters(): Array<{
  tool: AgentTool;
  name: string;
  capabilities: AdapterCapabilities;
}> {
  return Array.from(adapters.values()).map((a) => ({
    tool: a.tool,
    name: a.name,
    capabilities: a.capabilities,
  }));
}

/**
 * Check if a tool adapter is registered.
 */
export function hasAdapter(tool: AgentTool): boolean {
  return adapters.has(tool);
}

export type { AgentAdapter, AgentAdapterConfig } from './types.js';
