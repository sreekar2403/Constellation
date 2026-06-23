/**
 * ProviderRegistry — central service for managing provider connections.
 *
 * Responsibilities:
 *   1. Knows all 7 providers, their adapters, capabilities, and connection logic
 *   2. Maintains connection state for each provider (disconnected / connecting / live / idle / error)
 *   3. Emits provider:connected / provider:disconnected / provider:health_changed events
 *      via EventBus → WSServer → client ProviderStore
 *   4. Provides the AgentAdapter for a given provider so the dispatcher can spawn agents
 *
 * Does NOT manage process lifecycle — that's the ProcessManager's job.
 */

import { exec } from 'child_process';
import { EventBus } from './event-bus.js';
import { listAdapters } from './adapters/index.js';
import type { AgentAdapter } from './adapters/types.js';
import { WS_V3_EVENTS } from '@constellation/shared';
import type { ProviderConfig, ProviderType, ProviderHealth, ProviderCapability } from '@constellation/shared';

export type ProviderId = 'ollama' | 'claude-code' | 'gemini-cli' | 'opencode' | 'hermes' | 'pi' | 'kimi';

export type ProviderConnectionState = 'disconnected' | 'connecting' | 'live' | 'idle' | 'error';

interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  /** Lucide icon name */
  icon: string;
  /** Hex brand color */
  brandColor: string;
  type: ProviderType;
  defaultEndpoint?: string;
  description: string;
  /** Checks if the provider binary/endpoint is available */
  healthCheck(): Promise<boolean>;
  /** Fetches available models for the provider (optional) */
  fetchModels?: () => Promise<string[]>;
}

// ─── Helper functions ────────────────────────────────────────────────────────

async function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function fetchJson(url: string): Promise<any> {
  const stdout = await execPromise(`curl -s ${url}`);
  return JSON.parse(stdout);
}

async function checkHttpHealth(url: string, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = exec(
      `curl -s -o /dev/null -w \"%{http_code}\" --max-time ${timeout} \"${url}\"`,
      (_err, stdout) => {
        // Ignore exit code: `curl` sometimes exits non-zero (e.g. code 23
        // \"write error\" on Windows when the server closes the connection
        // mid-body) even though the HTTP status was 200. Trust stdout.
        const code = (stdout ?? '').trim();
        resolve(code === '200');
      }
    );
    req.on('error', () => resolve(false));
  });
}

async function checkCliExists(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? `where ${bin}` : `which ${bin}`;
    exec(cmd, (err) => resolve(!err));
  });
}

// ─── Provider metadata — icon/brandColor/type must match ProviderConfig schema ─

const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  ollama: {
    id: 'ollama',
    displayName: 'Ollama',
    icon: 'Server',
    brandColor: '#059669',
    type: 'Local HTTP',
    defaultEndpoint: 'http://localhost:11434',
    description: 'Local LLM inference server with open models',
    async healthCheck() {
      return checkHttpHealth(this.defaultEndpoint!);
    },
    async fetchModels() {
      try {
        const data = await fetchJson(`${this.defaultEndpoint!}/api/tags`);
        return data.models.map((m: { name: string }) => m.name);
      } catch (err) {
        console.warn(`Failed to fetch models for Ollama: ${err}`);
        return [];
      }
    },
  },
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    icon: 'Bot',
    brandColor: '#d97706',
    type: 'CLI PTY',
    description: 'Anthropic Claude via claude.ai CLI',
    async healthCheck() {
      return checkCliExists('claude');
    },
    // Claude Code does not have a local model listing API; return empty array
    fetchModels: async () => [],
  },
  'gemini-cli': {
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    icon: 'Gem',
    brandColor: '#2566eb',
    type: 'CLI PTY',
    description: 'Google Gemini via CLI (via PowerShell wrapper)',
    async healthCheck() {
      return checkCliExists('powershell'); // gemini-cli uses pwsh on Windows
    },
    // Gemini CLI does not have a local model listing API; return empty array
    fetchModels: async () => [],
  },
  opencode: {
    id: 'opencode',
    displayName: 'OpenCode',
    icon: 'Code2',
    brandColor: '#7c3aed',
    type: 'CLI PTY',
    description: 'OpenCode CLI with model-agnostic agent execution',
    async healthCheck() {
      return checkCliExists('opencode');
    },
    // OpenCode does not have a local model listing API; return empty array
    fetchModels: async () => [],
  },
  hermes: {
    id: 'hermes',
    displayName: 'Hermes Agent',
    icon: 'Sparkles',
    brandColor: '#f97316',
    type: 'CLI PTY',
    description: 'Nous Research Hermes via Hermes CLI',
    async healthCheck() {
      return checkCliExists('hermes');
    },
    // Hermes does not have a local model listing API; return empty array
    fetchModels: async () => [],
  },
  pi: {
    id: 'pi',
    displayName: 'Pi AI CLI',
    icon: 'MessageCircle',
    brandColor: '#14b8a6',
    type: 'ACP server',
    description: 'Pi AI personal assistant CLI (via ACP)',
    async healthCheck() {
      return checkCliExists('pi');
    },
    // Pi AI does not have a local model listing API; return empty array
    fetchModels: async () => [],
  },
  kimi: {
    id: 'kimi',
    displayName: 'Kimi CLI',
    icon: 'Moon',
    brandColor: '#ec4899',
    type: 'ACP server',
    description: 'Moonshot Kimi CLI with long-context support (via ACP)',
    async healthCheck() {
      return checkCliExists('kimi');
    },
    // Kimi does not have a local model listing API; return empty array
    fetchModels: async () => [],
  },
};

// ─── Capabilities per provider (mirrors SPEC.md) ─────────────────────────────

const PROVIDER_CAPABILITIES: Record<ProviderId, ProviderCapability[]> = {
  ollama: ['code-edit', 'code-review', 'terminal', 'file-read', 'file-write', 'long-context', 'local-runtime'],
  'claude-code': ['code-edit', 'code-review', 'terminal', 'file-read', 'file-write', 'web-search', 'image-gen', 'long-context', 'streaming', 'tool-use', 'local-runtime'],
  'gemini-cli': ['code-edit', 'code-review', 'terminal', 'file-read', 'file-write', 'web-search', 'long-context', 'tool-use', 'local-runtime'],
  opencode: ['code-edit', 'code-review', 'terminal', 'file-read', 'file-write', 'tool-use', 'local-runtime'],
  hermes: ['code-edit', 'terminal', 'file-read', 'file-write', 'tool-use', 'local-runtime'],
  pi: ['terminal', 'file-read', 'file-write', 'mcp', 'plan-mode'],
  kimi: ['code-edit', 'code-review', 'terminal', 'file-read', 'file-write', 'long-context', 'mcp', 'cloud-runtime']
};

// ─── Registry class ───────────────────────────────────────────────────────────

export class ProviderRegistry {
  /** Live connections: providerId → true */
  private liveProviders = new Set<ProviderId>();

  /** Per-provider error messages */
  private errors = new Map<ProviderId, string>;

  constructor(
    private eventBus: EventBus,
  ) {}

  /** Returns all 7 known provider IDs */
  listProviderIds(): ProviderId[] {
    return Object.keys(PROVIDER_META) as ProviderId[];
  }

  /**
   * Returns metadata for all providers (without connection state —
   * use getStatus for that).
   */
  listProviderMeta() {
    return this.listProviderIds().map((id) => {
      const meta = PROVIDER_META[id];
      return {
        id,
        displayName: meta.displayName,
        icon: meta.icon,
        brandColor: meta.brandColor,
        type: meta.type,
        description: meta.description,
        defaultEndpoint: meta.defaultEndpoint,
        capabilities: PROVIDER_CAPABILITIES[id],
        isLive: this.liveProviders.has(id),
        error: this.errors.get(id) ?? null,
      };
    });
  }

  /** Get the AgentAdapter for a live provider. Throws if not connected. */
  getAdapter(providerId: string): AgentAdapter {
    if (!this.liveProviders.has(providerId as ProviderId)) {
      throw new Error(`Provider \"${providerId}\" is not connected. Call connect() first.`);
    }
    // Dynamic import to avoid circular issues — adapters are registered at startup
    const { getAdapter: _get } = require('./adapters/index.js');
    return _get(providerId as ProviderId);
  }

  /** Check if a provider is currently live */
  isLive(providerId: string): boolean {
    return this.liveProviders.has(providerId as ProviderId);
  }

  /** Get connection status for a specific provider */
  getStatus(providerId: string): ProviderConnectionState {
    const pid = providerId as ProviderId;
    if (this.liveProviders.has(pid)) return 'live';
    if (this.errors.has(pid)) return 'error';
    return 'disconnected';
  }

  /** Connect a provider: run health check, update state, emit event */
  async connect(providerId: ProviderId): Promise<ProviderConfig> {
    const meta = PROVIDER_META[providerId];
    if (!meta) throw new Error(`Unknown provider: ${providerId}`);

    this.errors.delete(providerId);

    const available = await meta.healthCheck();
    if (!available) {
      const err = `Provider \"${meta.displayName}\" is not available. ` +
        (meta.type === 'Local HTTP'
          ? `Is the service running at ${meta.defaultEndpoint}?`
          : `Is \"${meta.id}\" installed and on your PATH?`);
      this.errors.set(providerId, err);
      const config = this.buildConfig(providerId, 'error');
      this.eventBus.emit(WS_V3_EVENTS.PROVIDER_ERROR, { provider: config, error: err });
      throw new Error(err);
    }

    this.liveProviders.add(providerId);
    const config = this.buildConfig(providerId, 'live');

    this.eventBus.emit(WS_V3_EVENTS.PROVIDER_CONNECTED, { provider: config });
    return config;
  }

  /** Disconnect a provider and emit the event */
  disconnect(providerId: ProviderId): void {
    if (!this.liveProviders.has(providerId)) return;
    this.liveProviders.delete(providerId);
    this.errors.delete(providerId);

    const config = this.buildConfig(providerId, 'disconnected');
    this.eventBus.emit(WS_V3_EVENTS.PROVIDER_DISCONNECTED, { provider: config });
  }

  /** Run a health-check on a live provider and emit provider:health_changed if status changed */
  async refreshHealth(providerId: ProviderId): Promise<ProviderConnectionState> {
    if (!this.liveProviders.has(providerId)) return 'disconnected';

    const meta = PROVIDER_META[providerId];
    const healthy = await meta.healthCheck();
    const newState: ProviderConnectionState = healthy ? 'live' : 'error';

    if (!healthy) {
      this.errors.set(providerId, `${meta.displayName} health check failed — connection lost`);
    } else {
      this.errors.delete(providerId);
    }

    const config = this.buildConfig(providerId, newState);
    this.eventBus.emit(WS_V3_EVENTS.PROVIDER_HEALTH_CHANGED, { provider: config });

    return newState;
  }

  /**
   * Get available models for a provider.
   * Returns empty array if provider not found or fetchModels not implemented.
   */
  async getModels(providerId: ProviderId): Promise<string[]> {
    const meta = PROVIDER_META[providerId];
    if (!meta || !meta.fetchModels) {
      return [];
    }
    try {
      return await meta.fetchModels();
    } catch (err) {
      console.warn(`Failed to fetch models for ${providerId}: ${err}`);
      return [];
    }
  }

  /***
   * Build a ProviderConfig conforming to the shared type definition.
   *
   * ProviderConfig fields:
   *   id, displayName, icon, brandColor, type, binary?, args?, endpoint?,
   *   env?, enabled, registeredAt, capabilities, healthStatus, lastHealthCheckAt?
   */
  private buildConfig(providerId: ProviderId, state: ProviderConnectionState): ProviderConfig {
    const meta = PROVIDER_META[providerId];

    const healthStatus: ProviderHealth =
      state === 'live' ? 'live'
      : state === 'error' ? 'offline'
      : 'offline';

    const config: ProviderConfig = {
      id: providerId,
      displayName: meta.displayName,
      icon: meta.icon,
      brandColor: meta.brandColor,
      type: meta.type,
      // Populate endpoint/binary based on type
      ...(meta.type === 'Local HTTP' && meta.defaultEndpoint
        ? { endpoint: meta.defaultEndpoint }
        : {}),
      ...(meta.type === 'CLI PTY'
        ? { binary: meta.id, args: [] }
        : {}),
      enabled: state !== 'disconnected',
      registeredAt: new Date().toISOString(),
      capabilities: PROVIDER_CAPABILITIES[providerId],
      healthStatus,
      lastHealthCheckAt: new Date().toISOString(),
    };

    return config;
  }

  /** Auto-discover which providers are available (runs health checks in parallel) */
  async discover(): Promise<Map<ProviderId, boolean>> {
    const ids = this.listProviderIds();
    const results = await Promise.all(
      ids.map(async (id) => [id, await PROVIDER_META[id].healthCheck()] as const)
    );
    return new Map(results);
  }
}