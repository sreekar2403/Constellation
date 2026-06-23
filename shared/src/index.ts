// ===== Core Types for Constellation =====
// Shared between server and client

export type AgentState =
  | 'initializing'
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting_for_input'
  | 'error'
  | 'completed';

export type AgentTool = 'claude-code' | 'gemini-cli' | 'opencode' | 'ollama' | 'hermes' | 'pi' | 'kimi';

export type TopologyMode =
  | 'sequential'
  | 'parallel'
  | 'hierarchical'
  | 'peer-to-peer'
  | 'auto';

export type EventType =
  | 'agent_spawned'
  | 'agent_state_changed'
  | 'agent_message'
  | 'agent_question'
  | 'agent_answer'
  | 'agent_file_change'
  | 'agent_completed'
  | 'agent_error';

// === Data Models ===

export interface AgentNode {
  id: string;
  name: string;
  tool: AgentTool;
  model: string;
  parentId: string | null;
  state: AgentState;
  workingDirectory: string;
  createdAt: string;
  pendingQuestion: QuestionInfo | null;
  topologyRole: 'orchestrator' | 'worker' | 'peer';
  position: { x: number; y: number; z: number };
}

export interface EdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'parent_child' | 'peer_message';
  lastActivityAt: string;
}

export interface QuestionInfo {
  promptText: string;
  suggestedReplies: string[];
  rawTerminalContext: string;
}

export interface AgentEvent {
  type: EventType;
  agentId: string;
  parentId?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface SessionConfig {
  id: string;
  name: string;
  topology: TopologyMode;
  agents: AgentConfig[];
  createdAt: string;
}

export interface AgentConfig {
  tool: AgentTool;
  model: string;
  name: string;
  workingDirectory: string;
  flags?: Record<string, string>;
}

export interface FileChangeInfo {
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  agentId: string;
  diff?: string;
  timestamp: string;
}

// === Constants ===

export const AGENT_STATE_COLORS: Record<AgentState, string> = {
  initializing: '#6B7B8D',
  idle: '#4A90D9',
  thinking: '#9B59B6',
  executing: '#00BCD4',
  waiting_for_input: '#FF9800',
  error: '#E74C3C',
  completed: '#2ECC71',
};

export const WS_MESSAGE_TYPES = {
  START_AGENT: 'start_agent',
  STOP_AGENT: 'stop_agent',
  SEND_INPUT: 'send_input',
  CREATE_SESSION: 'create_session',
  SAVE_SESSION: 'save_session',
  LOAD_SESSION: 'load_session',
  LIST_SESSIONS: 'list_sessions',
  AGENT_EVENT: 'agent_event',
  SESSION_STATE: 'session_state',
  ERROR: 'error',
} as const;

export const TOPOLOGY_LABELS: Record<TopologyMode, string> = {
  sequential: 'Sequential Chain',
  parallel: 'Parallel',
  hierarchical: 'Hierarchical',
  'peer-to-peer': 'Peer-to-Peer',
  auto: 'Auto-Detect',
};

// ============================================================
// v3.0 — Agent OS types (CEO Kanban / Provider Registry / Self-Evolution)
// ============================================================

/* === Tasks (CEO Kanban) === */

export type TaskStatus =
  | 'backlog'
  | 'needs-clarification'
  | 'in-progress'
  | 'review'
  | 'done';

export type TaskPriority = 'p0' | 'p1' | 'p2';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Provider id (e.g. 'claude-code', 'ollama'), or 'auto' for dispatcher to pick */
  platform: string | 'auto';
  /** Optional model override (e.g. 'opus-4.5') */
  model?: string;
  /** Workspace folder path */
  workspace: string;
  /** Assigned worker agent id (populated when in-progress) */
  assignedAgentId?: string;
  /** Provider id that ended up executing the task */
  assignedProvider?: string;
  /** Question from dispatcher if status === 'needs-clarification' */
  clarificationRequest?: string;
  /** 0-100 */
  progress: number;
  /** Summary of what the worker produced */
  deliverable?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  /** Skill that was used to execute this task, if any */
  skillFiredId?: string;
  tokensUsed: number;
  /** Links to the TaskObservation created when this task completed */
  observationId?: string;
}

/* === Providers (Registry) === */

export type ProviderCapability =
  | 'code-edit'
  | 'code-review'
  | 'terminal'
  | 'file-read'
  | 'file-write'
  | 'web-search'
  | 'image-gen'
  | 'long-context'
  | 'streaming'
  | 'mcp'
  | 'plan-mode'
  | 'tool-use'
  | 'local-runtime'
  | 'cloud-runtime';

export type ProviderHealth = 'live' | 'idle' | 'offline';

export type ProviderType = 'Local HTTP' | 'CLI PTY' | 'ACP server';

export interface ProviderConfig {
  id: string;
  displayName: string;
  /** Lucide icon name */
  icon: string;
  /** Hex brand color */
  brandColor: string;
  type: ProviderType;
  /** Default binary or endpoint */
  binary?: string;
  args?: string[];
  endpoint?: string;
  env?: Record<string, string>;
  enabled: boolean;
  registeredAt: string;
  capabilities: ProviderCapability[];
  healthStatus: ProviderHealth;
  /** Last successful health-check timestamp */
  lastHealthCheckAt?: string;
}

/* === Self-Evolution (Skill loop) === */

export interface TaskObservation {
  id: string;
  taskId: string;
  agentId: string;
  providerId: string;
  /** nomic-embed-text vector (1536-dim in v1) */
  taskEmbedding?: number[];
  toolCalls: ToolCallRecord[];
  tokensUsed: number;
  durationMs: number;
  success: boolean;
  createdAt: string;
}

export interface ToolCallRecord {
  kind: 'tool_call' | 'llm_call' | 'file_read' | 'file_write' | 'bash';
  payloadShape: Record<string, unknown>;
  /** Free-form summary for human reading */
  summary?: string;
}

export type SkillStatus = 'active' | 'archived';

export interface SkillStep {
  kind: ToolCallRecord['kind'];
  /** Cached shape, not literal args (re-derived at fire-time) */
  payloadShape: Record<string, unknown>;
  expectedOutputShape?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  providerId: string;
  /** Centroid embedding of matched observations */
  triggerEmbedding?: number[];
  /** Default 0.85 */
  similarityThreshold: number;
  steps: SkillStep[];
  /** Pattern that birthed this skill */
  sourcePatternId: string;
  /** 1 = born directly, 2+ = evolved variant */
  generation: number;
  /** For mutated skills: the skill this one branched from */
  parentSkillId?: string;
  usageCount: number;
  totalTokensSaved: number;
  createdAt: string;
  lastFiredAt?: string;
  status: SkillStatus;
}

export interface SkillTrigger {
  id: string;
  skillId: string;
  matchedTaskId: string;
  similarityScore: number;
  tokensSaved: number;
  timestamp: string;
}

export type PatternStatus =
  | 'observing'
  | 'pending-crystallisation'
  | 'crystallised'
  | 'rejected';

export interface DetectedPattern {
  id: string;
  observationIds: string[];
  /** Centroid embedding of cluster */
  centroidEmbedding?: number[];
  frequency: number;
  avgTokens: number;
  successRate: number;
  status: PatternStatus;
  detectedAt: string;
}

/* === Aggregated stats (for Dashboard KPI strip) === */

export interface SystemStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalTokensUsed: number;
  totalTokensSaved: number;
  activeAgents: number;
  liveProviders: number;
  totalProviders: number;
  totalSkills: number;
  skillsFiredToday: number;
}

/* === Extended WS message types (v3 events) === */

export const WS_V3_EVENTS = {
  // Tasks
  TASK_CREATED: 'task:created',
  TASK_CLAIMED: 'task:claimed',
  TASK_NEEDS_CLARIFICATION: 'task:needs-clarification',
  TASK_DISPATCHED: 'task:dispatched',
  TASK_PROGRESS: 'task:progress',
  TASK_REVIEW: 'task:review',
  TASK_APPROVED: 'task:approved',
  TASK_FAILED: 'task:failed',
  // Providers
  PROVIDER_CONNECTED: 'provider:connected',
  PROVIDER_DISCONNECTED: 'provider:disconnected',
  PROVIDER_ERROR: 'provider:error',
  PROVIDER_HEALTH_CHANGED: 'provider:health_changed',
  // Skills
  PATTERN_DETECTED: 'pattern:detected',
  SKILL_CREATED: 'skill:created',
  SKILL_TRIGGERED: 'skill:triggered',
  SKILL_MUTATED: 'skill:mutated',
} as const;

export type WSV3EventType = (typeof WS_V3_EVENTS)[keyof typeof WS_V3_EVENTS];

/* === Missing type aliases === */

// Provider = ProviderConfig + healthStatus (the full runtime shape from the store)
export type Provider = ProviderConfig;

// ProviderRegistration = input shape when registering a new provider
// (all fields optional except those required to identify the provider)
export type ProviderRegistration = Partial<Omit<ProviderConfig, 'healthStatus'>>;

// Pattern = DetectedPattern (what the pattern detector produces)
export type Pattern = DetectedPattern;

// Observation = TaskObservation (a completed task's audit trail)
export type Observation = TaskObservation;
