# Constellation: Component-Based Execution Plan

> **Status**: ✅ All 9 components (A–I) fully implemented. MVP complete.

This document provides a detailed roadmap for building the Constellation 3D Neural-Visualization Cockpit. It organizes the work by system components to allow for parallel development and clear ownership. Each component section includes implementation details, file references to the actual codebase, interfaces, and verification criteria.

---

## Table of Contents

- [System Architecture Overview](#system-architecture-overview)
- [Shared Types and Contracts](#shared-types-and-contracts)
- [Component A: Orchestration Server](#component-a-orchestration-server)
- [Component B: 3D Canvas Engine](#component-b-3d-canvas-engine)
- [Component C: Agent Adapters](#component-c-agent-adapters)
- [Component D: Side Panels](#component-d-side-panels)
- [Component E: Session Manager](#component-e-session-manager)
- [Component F: WebSocket Event Bus](#component-f-websocket-event-bus)
- [Component G: Topology Engine](#component-g-topology-engine)
- [Component H: Intervention System](#component-h-intervention-system)
- [Component I: Accessibility Fallback](#component-i-accessibility-fallback)
- [Integration and Testing Strategy](#integration-and-testing-strategy)

---

## System Architecture Overview

Constellation uses a client-server architecture with a real-time WebSocket connection for event streaming. The backend manages agent processes via PTY (pseudo-terminal) sessions, normalizes their output through adapter wrappers, and streams typed events to the frontend. The frontend renders a 3D visualization of the agent network using Three.js (react-three-fiber) and provides interactive control panels via React + Zustand state management.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + TS)                         │
│                                                                     │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐  │
│  │  3D Canvas (R3F)     │  │  Side Panels                       │  │
│  │  - AgentNodeMesh     │  │  - TerminalPanel (logs)            │  │
│  │  - AgentEdgeLine     │  │  - CodePanel (file changes)        │  │
│  │  - ForceGraph (d3)   │  │  - FileBrowserPanel (workspace)    │  │
│  │  - TopologyEngine    │  │  - MemoryPanel (context)           │  │
│  │  - LayoutSelector    │  │  - PanelContainer (resizable)      │  │
│  └──────────┬───────────┘  └──────────────┬─────────────────────┘  │
│             │                              │                        │
│             └────── Zustand Store ─────────┘                        │
│                        │                                            │
│         InterventionPanel  │  SessionDashboard                     │
│                        │                                            │
│    FallbackView (2D) ◄──┤── AccessibilityProvider                  │
└────────────────────────┼────────────────────────────────────────────┘
                         │ WebSocket (ws://localhost:3002)
┌────────────────────────┼────────────────────────────────────────────┐
│            ORCHESTRATION SERVER (Node.js + Express)                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │ SessionMgr   │  │ ProcessMgr   │  │ WebSocketServer  │   │  │
│  │  │ (CRUD + Map) │  │ (node-pty)   │  │ (ws library)     │   │  │
│  │  └──────────────┘  └──────┬───────┘  └──────────────────┘   │  │
│  │                           │                                  │  │
│  │  ┌────────────────────────▼──────────────────────────────┐  │  │
│  │  │  Agent Adapters Registry                               │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │  │
│  │  │  │ Claude   │ │ Gemini   │ │ OpenCode │ │ Ollama   │ │  │  │
│  │  │  │ Code     │ │ CLI      │ │ CLI      │ │ HTTP API │ │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Flow

```
CLI stdout → AgentAdapter → EventBus → WebSocket Server (ws://:3002)
                                           │
                                    ┌──────┴──────┐
                                    │   Network    │
                                    └──────┬──────┘
                                           │
                               WebSocket Client (reconnecting)
                                           │
                                    useWebSocket hook
                                           │
                                    ┌──────┴──────┐
                                    │ Zustand Store│
                                    └──────┬──────┘
                                           │
                           ┌───────────────┼───────────────┐
                           │               │               │
                      Cockpit.tsx    PanelContainer  InterventionPanel
                      (3D scene)     (4 side panels) (answer input)
```

### Dependency Graph

```
 1.  shared/src/index.ts        Foundation (types, constants)
        │
 2.  Server: event-bus.ts       Internal pub/sub
        │
 3.  Server: websocket-server.ts WS message router
        │
 4.  Server: session-manager.ts  Session CRUD (Map-based)
        │
 5.  Server: process-manager.ts  PTY spawn/kill (node-pty)
        │
 6.  Server: adapters/*.ts      4 CLI wrappers
        │
 7.  Client: services/websocket-client.ts  Reconnecting WS client
        │
 8.  Client: hooks/useWebSocket.ts         Lifecycle hook
        │
 9.  Client: store/*.ts                    4 Zustand stores
        │
10.  Client: Cockpit.tsx + Agents + Edges  3D scene
        │
11.  Client: TopologyEngine.ts             4 layout modes
        │
12.  Client: InterventionPanel.tsx         Answer dispatch
        │
13.  Client: panels/*.tsx                  4 side panels
        │
14.  Client: accessibility/*.tsx           2D fallback view
```

### Parallel Workstream Strategy

| Stream | Focus | Components | Status |
|--------|-------|-----------|--------|
| **Stream 1: Backend Core** | Server, Adapters, WebSocket | A, C, F | ✅ Complete |
| **Stream 2: 3D Visualization** | Canvas, Topology, Intervention | B, G, H | ✅ Complete |
| **Stream 3: UI and State** | Panels, Session, Accessibility | D, E, I | ✅ Complete |

---

## Shared Types and Contracts

**File**: `shared/src/index.ts`

All components must adhere to these core interfaces to ensure compatibility between server and client.

### AgentNode

The central data structure representing a CLI agent process.

```typescript
interface AgentNode {
  id: string;                    // Unique identifier (e.g., "agent_claude_abc123")
  name: string;                  // Human-readable name (e.g., "Claude-Code-1")
  tool: string;                  // CLI tool type: "claude" | "gemini" | "opencode" | "ollama"
  state: AgentState;             // Current lifecycle state (see below)
  model: string;                 // Model identifier (e.g., "claude-sonnet-4-20250514")
  workingDirectory: string;      // Agent's cwd
  position: Vec3;                // 3D position { x, y, z } in the scene
  parentId: string | null;       // If spawned by another agent; null = root
  children: string[];            // IDs of sub-agents spawned by this agent
  topologyRole: TopologyRole;    // Role in the hierarchy
  createdAt: string;             // ISO timestamp
  pendingQuestion: Question | null; // If agent is waiting for user input
  metadata: Record<string, string>; // Extensible key-value store
}
```

### AgentState

Agents follow a deterministic state machine:

```
initializing → idle → thinking → executing → waiting_for_input → completed
                    ↑           ↓
                    └─── error ──┘
```

Each state maps to a specific visual representation in the 3D scene:

| State | Color | Visual Effect |
|-------|-------|---------------|
| `initializing` | `#94a3b8` (cool gray-blue) | Slow fade-in animation |
| `idle` | `#22c55e` (soft green) | Gentle breathing pulse |
| `executing` | `#3b82f6` (cyan-blue) | Rotating outer ring |
| `thinking` | `#a855f7` (violet/purple) | Flicker + particle swirl |
| `waiting_for_input` | `#f59e0b` (amber/orange) | Badge + pulse, icon changes to "?" |
| `completed` | `#22c55e` → fades to gray | Brief green flash, then dim |
| `error` | `#ef4444` (red) | Red flash, then steady dim-red glow |

### AgentEdge

Represents a relationship between two agents.

```typescript
interface AgentEdge {
  id: string;           // Unique edge identifier
  sourceId: string;     // Parent or orchestrator agent ID
  targetId: string;     // Child or sub-agent ID
  type: EdgeType;       // "delegation" | "communication" | "supervision" | "unknown"
  activity: number;     // Activity level (0-1), affects visual thickness/glow
}
```

### Event Schema

All WebSocket messages adhere to typed event schema:

```typescript
type ServerEvent =
  | { type: 'agent_state_changed'; payload: { agentId: string; state: AgentState; previousState: AgentState } }
  | { type: 'agent_spawned'; payload: { agent: AgentNode } }
  | { type: 'agent_removed'; payload: { agentId: string } }
  | { type: 'agent_question'; payload: { agentId: string; question: Question } }
  | { type: 'agent_message'; payload: { agentId: string; text: string; timestamp: string } }
  | { type: 'agent_file_change'; payload: { agentId: string; filePath: string; changeType: 'modified' | 'created' | 'deleted' } }
  | { type: 'session_list'; payload: { sessions: SessionSummary[] } }
  | { type: 'session_loaded'; payload: { session: SessionConfig; agents: AgentNode[]; edges: AgentEdge[] } }
  | { type: 'error'; payload: { message: string; code: string } }
  | { type: 'connection_ack'; payload: { serverVersion: string } };

type ClientEvent =
  | { type: 'create_session'; payload: { name: string; config: SessionConfig } }
  | { type: 'load_session'; payload: { sessionId: string } }
  | { type: 'save_session'; payload: { sessionId: string } }
  | { type: 'delete_session'; payload: { sessionId: string } }
  | { type: 'start_agent'; payload: { tool: string; name?: string; model?: string; cwd?: string } }
  | { type: 'stop_agent'; payload: { agentId: string } }
  | { type: 'send_input'; payload: { agentId: string; input: string } }
  | { type: 'resync' };
```

### Question

When an agent needs human input:

```typescript
interface Question {
  text: string;         // The literal prompt text
  options?: string[];   // Suggested reply buttons (e.g., ["Yes", "No"])
  context?: string;     // Last N lines of terminal output for context
  timestamp: string;    // When the question was detected
}
```

### TopologyRole

```typescript
type TopologyRole = 'orchestrator' | 'planner' | 'worker' | 'observer' | 'unknown';
```

---

## Component A: Orchestration Server

**Status**: ✅ Implemented
**Files**: `server/src/index.ts`, `server/src/session-manager.ts`, `server/src/process-manager.ts`, `server/src/event-bus.ts`

The central hub for managing agent processes and routing events. It's the only component that directly interacts with CLI processes via PTY.

### Purpose
Launch, monitor, and control CLI agent sessions. Provide a single HTTP endpoint for health checks and a WebSocket endpoint for real-time bidirectional communication.

### Sub-components

#### Session Manager (`server/src/session-manager.ts`)
- In-memory `Map<string, Session>` store
- CRUD operations: `createSession`, `getSession`, `listSessions`, `updateSession`, `deleteSession`
- Each session stores: config, agent list, current state, timestamps
- Thread-safe operations (single-threaded Node.js event loop)

#### Process Manager (`server/src/process-manager.ts`)
- `node-pty` wrapper for spawning pseudo-terminal processes
- `spawnAgent(tool, name, model, cwd)` → validates tool, creates PTY, returns agent ID
- `sendInput(agentId, text)` → writes to PTY stdin
- `terminateAgent(agentId)` → SIGTERM, fallback to SIGKILL after timeout
- Event emitters: `onData`, `onExit`, `onError` per agent
- Connects adapter output parsing → EventBus

#### WebSocket Server (`server/src/websocket-server.ts`)
- `ws` library on port 3002 (configurable)
- Client→Server message router by event type
- Server→Client broadcast on state changes
- Heartbeat ping/pong every 30s, timeout after 10s
- Handles: `start_agent`, `stop_agent`, `send_input`, `session_*`, `resync`

#### Event Bus (`server/src/event-bus.ts`)
- Typed pub/sub with `on(event, handler)` / `emit(event, payload)` / `off(event, handler)`
- Backpressure: queues events when no subscribers
- Timestamps all events

### Key Interfaces

```typescript
// Session Manager
createSession(config: SessionConfig): Session
getSession(id: string): Session | undefined
listSessions(): SessionSummary[]
deleteSession(id: string): boolean

// Process Manager
async spawnAgent(tool: string, name: string, model: string, cwd: string): Promise<string>
sendInput(agentId: string, text: string): void
terminateAgent(agentId: string): void
getAgentOutput(agentId: string): string[]

// WebSocket Server
broadcast(event: ServerEvent): void
handleMessage(client: WebSocket, message: ClientEvent): void
```

### Server Entry Point (`server/src/index.ts`)

```typescript
// Initialization order:
// 1. Create EventBus
// 2. Create SessionManager
// 3. Create ProcessManager (passes EventBus)
// 4. Create WebSocketServer (passes EventBus, SessionManager, ProcessManager)
// 5. Create Express app with health route
// 6. Start HTTP server (port 3001)
// 7. Attach WebSocket server to HTTP server
// 8. Graceful shutdown handler (SIGTERM, SIGINT)
```

### Verification
- [x] Server starts without errors
- [x] `GET /health` returns `{ status: 'ok', uptime: <seconds>, agents: <count> }`
- [x] WebSocket connects at `ws://localhost:3002`
- [x] Session CRUD works via WebSocket messages
- [x] `tsc --noEmit` passes (zero errors)

---

## Component B: 3D Canvas Engine

**Status**: ✅ Implemented
**Files**: `client/src/components/Cockpit.tsx`, `client/src/components/AgentNodeMesh.tsx`, `client/src/components/AgentEdgeLine.tsx`, `client/src/components/ForceGraph.ts`, `client/src/types/d3-force-3d.d.ts`

The primary visualization layer using React Three Fiber. Renders the neural network graph and agent nodes in 3D space with smooth animations and real-time updates.

### Purpose
Provide an immersive, real-time visualization of the multi-agent system. Each agent appears as a colored sphere with state-driven animation. Edges show relationships. Camera controls let the user explore the scene naturally.

### Sub-components

#### Cockpit (`Cockpit.tsx`)
- `@react-three/fiber` Canvas wrapper with:
  - **Lighting**: `<ambientLight intensity={0.5}>` + `<directionalLight position={[10, 10, 10]}>`
  - **Background**: `<color attach="background" args={['#0a0a1a']}>`
  - **Stars**: `<Stars radius={100} depth={50} count={3000} factor={4}>` from drei
  - **Performance**: `<AdaptiveDpr pixelatedBlending />`
- `OrbitControls` for camera (left-drag orbit, right-drag pan, scroll zoom)
- Renders the layout mode selector pills at the bottom
- Maps `useAgentStore` agents to `AgentNodeMesh` and edges to `AgentEdgeLine`
- Passes topology mode from `useUIStore` to `TopologyEngine`

#### AgentNodeMesh (`AgentNodeMesh.tsx`)
- `<mesh>` with `<sphereGeometry>` + `<meshStandardMaterial>` with emissive color
- Color determined by agent state (see state-color map above)
- `<Text>` from drei for billboarded name label (always facing camera)
- Click handler → `useUIStore.selectAgent(agentId)`
- Double-click handler → camera focuses on node position
- Size scales by role: orchestrator = 1.0, planner = 0.7, worker = 0.5
- Animation: pulsing emissive intensity when `idle`, faster pulse when `waiting_for_input`

#### AgentEdgeLine (`AgentEdgeLine.tsx`)
- `<Line>` from drei with cubic bezier curve between source/target positions
- Color gradient from source agent's color to target agent's color
- Opacity varies with edge activity level
- Curved paths for visual clarity (midpoint offset based on distance)

#### ForceGraph (`ForceGraph.ts`)
- Wraps `d3-force-3d` simulation
- Forces configured:
  - `forceManyBody()` — charge strength based on role (orchestrator more repulsive)
  - `forceLink()` — edge distances with spring tension
  - `forceCenter()` — keeps graph centered
  - `forceCollide()` — prevents node overlap
- On each tick: updates agent positions in `useAgentStore`
- Throttles updates to 60fps via `requestAnimationFrame`
- Only active when topology mode is `neural`

### d3-force-3d Type Declarations

**File**: `client/src/types/d3-force-3d.d.ts`

Since `d3-force-3d` has built-in types but uses a different export shape than `@types/d3-force`, a custom declaration file maps the API:

```typescript
declare module 'd3-force-3d' {
  export function forceSimulation<N extends SimulationNodeDatum>(nodes?: N[]): ForceSimulation<N>;
  export function forceManyBody<N extends SimulationNodeDatum>(): ForceManyBody<N>;
  export function forceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(links?: L[]): ForceLink<N, L>;
  export function forceCenter<N extends SimulationNodeDatum>(x?: number, y?: number, z?: number): ForceCenter<N>;
  export function forceCollide<N extends SimulationNodeDatum>(radius?: number): ForceCollide<N>;
  // ... full interface declarations
}
```

### State-to-Visual Mapping

| Agent State | Sphere Color | Emissive | Animation |
|-------------|-------------|----------|-----------|
| `initializing` | `#94a3b8` | `#475569` | Slow fade-in (0→1 opacity, 500ms) |
| `idle` | `#22c55e` | `#166534` | Gentle breathing (scale 1.0↔1.05) |
| `executing` | `#3b82f6` | `#1e40af` | Rotating outer ring |
| `thinking` | `#a855f7` | `#6b21a8` | Flicker + particle swirl |
| `waiting_for_input` | `#f59e0b` | `#92400e` | Pulse faster + "?" icon |
| `completed` | `#22c55e → #64748b` | dims | Green flash for 1s, then fade to gray |
| `error` | `#ef4444` | `#991b1b` | Red flash (300ms) → steady dim glow |

### Verification
- [x] `tsc --noEmit` passes (zero errors)
- [x] `vite build` succeeds (bundles Three.js + React)
- [x] Scene renders with Stars + lighting + grid
- [x] Agent spheres appear colored by state
- [x] Edge lines connect related agents
- [x] Camera controls work (orbit, pan, zoom)
- [x] Double-click agent focuses camera
- [x] Bundle size: ~1.27MB (gzip: ~366KB)

---

## Component C: Agent Adapters

**Status**: ✅ Implemented
**Files**: `server/src/adapters/types.ts`, `server/src/adapters/claude-adapter.ts`, `server/src/adapters/gemini-adapter.ts`, `server/src/adapters/opencode-adapter.ts`, `server/src/adapters/ollama-adapter.ts`, `server/src/adapters/index.ts`

Standardized wrappers for different CLI agents. Each adapter normalizes input/output for a specific AI tool, translating its unique output format into the Constellation event system.

### Purpose
Abstract away the differences between CLI tools. Whether the agent is Claude Code, Gemini CLI, OpenCode, or Ollama, the rest of the system interacts through a uniform `AgentAdapter` interface.

### Adapter Interface (`types.ts`)

```typescript
interface AgentAdapter {
  /** Unique tool identifier */
  readonly tool: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** CLI binary or endpoint */
  readonly command: string;

  /** What the adapter supports */
  readonly capabilities: AgentCapabilities;

  /** Build process config for spawning */
  buildConfig(config: AgentConfig): SpawnConfig;

  /** Parse a raw output chunk and emit events */
  parseOutput(chunk: string, context: ParseContext): ParsedResult;

  /** Detect if output contains a question/prompt */
  detectQuestion(chunk: string): Question | null;

  /** Detect file changes in output */
  detectFileChange(chunk: string): FileChange | null;
}

interface AgentCapabilities {
  supportsSubAgents: boolean;    // Can this tool spawn sub-agents?
  supportsFileWrites: boolean;   // Does it output file diffs?
  supportsQuestions: boolean;    // Does it pause for user input?
  supportsStreaming: boolean;    // Does it stream output in real-time?
  maxBufferSize: number;         // Max output buffer before flushing
}
```

### Adapter Registry (`index.ts`)

```typescript
const adapterRegistry = new Map<string, AgentAdapter>();

// Registered adapters
registerAdapter(new ClaudeCodeAdapter());
registerAdapter(new GeminiCliAdapter());
registerAdapter(new OpenCodeAdapter());
registerAdapter(new OllamaAdapter());

export function getAdapter(tool: string): AgentAdapter | undefined;
export function listAdapters(): AgentAdapter[];
export function registerAdapter(adapter: AgentAdapter): void;
```

### Adapter Implementations

#### Claude Code Adapter (`claude-adapter.ts`)
- **Command**: `claude`
- **Spawning**: `claude --print <prompt>` or `claude -p <prompt>` depending on mode
- **Question Detection**:
  - Pattern: `\?\s*$` (line ending with question mark)
  - Permission prompts: `"Do you want to continue?"`, `"Allow this command?"`
  - File selection: `"Which file?"`, y/n prompts
- **Sub-agent Detection**: Detects "Task tool" invocation markers
- **File Change Detection**: Parses diff output (`diff --git` sections)

#### Gemini CLI Adapter (`gemini-adapter.ts`)
- **Command**: `gemini`
- **Spawning**: `gemini run` or `gemini chat` depending on config
- **Question Detection**: Permission prompts, clarification questions
- **Sub-agent Detection**: Tool-call markers in output
- **File Change Detection**: Parses output for file modification patterns

#### OpenCode Adapter (`opencode-adapter.ts`)
- **Command**: `opencode`
- **Spawning**: `opencode` with pipe mode for prompt input
- **Question Detection**: Structured event output markers, permission prompts
- **Sub-agent Detection**: Delegation calls in structured output
- **File Change Detection**: Structured file-change events

#### Ollama Adapter (`ollama-adapter.ts`)
- **Endpoint**: HTTP `http://localhost:11434` (configurable)
- **API**: Uses `/api/generate` or `/api/chat` endpoints
- **No PTY**: HTTP request-response, not a persistent terminal
- **State Machine**: Simplified (no `waiting_for_input` since HTTP is stateless)
- **Model Support**: Configurable model name (Hermes, Llama, etc.)

### Capabilities Matrix

| Adapter | Sub-Agents | File Writes | Questions | Streaming | Buffer |
|---------|-----------|-------------|-----------|-----------|--------|
| Claude Code | ✅ | ✅ | ✅ | ✅ | 4096 |
| Gemini CLI | ✅ | ✅ | ✅ | ✅ | 4096 |
| OpenCode | ✅ | ✅ | ✅ | ✅ | 4096 |
| Ollama | ❌ | ❌ | ❌ | ✅ | 8192 |

### Verification
- [x] All 4 adapters registered and listed
- [x] Each adapter returns correct capabilities
- [x] Question detection regex patterns match test strings
- [x] `tsc --noEmit` passes

---

## Component D: Side Panels

**Status**: ✅ Implemented
**Files**: `client/src/components/panels/PanelContainer.tsx`, `client/src/components/panels/TerminalPanel.tsx`, `client/src/components/panels/CodePanel.tsx`, `client/src/components/panels/FileBrowserPanel.tsx`, `client/src/components/panels/MemoryPanel.tsx`, `client/src/store/useLogStore.ts`

Interactive UI elements for deep-dive inspection of agent activity. Four panels in a collapsible right-side drawer with resize handle.

### Purpose
Provide detailed views of agent activity beyond the 3D abstraction. Terminal for raw logs, Code for file changes, Files for workspace browsing, Memory for agent context and history.

### PanelContainer (`PanelContainer.tsx`)
- Fixed right-side drawer, collapsible via button
- Resize handle on the left edge (drag to resize, 250px–800px range)
- Tab bar at top switches between the 4 panels
- Each tab shows an icon and label
- Collapse button: writing-mode vertical text "◀ PANELS ▶"
- Uses local `useState` for panel state (collapsed, active, width)
- Mouse drag resize using `mousedown`/`mousemove`/`mouseup` event listeners

### TerminalPanel (`TerminalPanel.tsx`)
- Reads from `useLogStore` — all logs across all agents
- Color-coded by log level:
  - `info` → `#94a3b8` (gray)
  - `warn` → `#f59e0b` (amber)
  - `error` → `#ef4444` (red)
  - `success` → `#22c55e` (green)
- Each log entry shows: `[timestamp] agentName: text`
- Scrollable container with auto-scroll to bottom on new entries
- Agent name prefix is highlighted in purple (`#a78bfa`)

### CodePanel (`CodePanel.tsx`)
- Reads `fileChanges` from `useLogStore`
- Each file change shows: file path + change type badge
- Change types: `modified` (blue), `created` (green), `deleted` (red)
- Grouped by agent (agent name as section header)
- Empty state: "No file changes detected"

### FileBrowserPanel (`FileBrowserPanel.tsx`)
- Reads files from `useLogStore.files`
- File entries show name, size, and type
- Empty state: "No files to display"

### MemoryPanel (`MemoryPanel.tsx`)
- Reads `memories` from `useLogStore`
- Categorized by type: `decision`, `pattern`, `issue`, `fact`
- Each memory shows: text snippet + category badge + timestamp
- Empty state: "No memories recorded"

### useLogStore (`useLogStore.ts`)
```typescript
interface LogStore {
  logs: Record<string, LogEntry[]>;       // agentId → log entries
  fileChanges: FileChangeEntry[];         // All detected file changes
  memories: MemoryEntry[];                // Agent context/history
  files: FileEntry[];                     // Workspace files
  
  addLog: (agentName: string, text: string, level: LogLevel) => void;
  addFileChange: (agentId: string, filePath: string, changeType: FileChangeType) => void;
  addMemory: (text: string, type: MemoryType, tags: string[]) => void;
  addFile: (name: string, path: string, size: number, type: string) => void;
  clearAgent: (agentName: string) => void;
  reset: () => void;
}
```

### Verification
- [x] All 4 panels render with correct tab icons
- [x] Panel collapses/expands
- [x] Resize handle works
- [x] Log entries appear with color coding
- [x] File changes grouped by agent
- [x] Empty states display when no data

---

## Component E: Session Manager

**Status**: ✅ Implemented
**Files**: `client/src/components/SessionDashboard.tsx`, `client/src/store/useSessionStore.ts`

Persistence and state management for user sessions. Allows creating, saving, loading, and deleting cockpit configurations.

### Purpose
Save and restore the state of the cockpit across page refreshes. Each session stores agent configurations, workspace layout, and current state.

### Sub-components

#### Session Dashboard (`SessionDashboard.tsx`)
- Modal overlay accessed from HUD "Sessions" button
- Dark overlay background (`rgba(0,0,0,0.7)`)
- **Header**: "Session Dashboard" title + close button (×)
- **Session List**: Cards for each saved session showing:
  - Session name
  - Agent count
  - Created/last modified timestamps
  - Load button → restores session
  - Delete button → removes from localStorage
- **New Session**: Button to create a blank session
- Keyboard: Escape closes the modal

#### Session Store (`useSessionStore.ts`)
```typescript
interface SessionStore {
  sessions: SessionSummary[];          // Saved session list
  currentSession: SessionSummary | null; // Currently active session
  
  createSession: (name: string) => void;
  saveSession: (session: SessionConfig) => void;
  loadSession: (sessionId: string) => SessionConfig | undefined;
  deleteSession: (sessionId: string) => void;
  setCurrentSession: (session: SessionSummary | null) => void;
  loadFromDisk: () => void;            // Load all from localStorage
}
```

#### Persistence Strategy
- Sessions stored in `localStorage` under key `constellation_sessions`
- On app mount, `loadFromDisk()` restores all saved sessions
- Each session saved as JSON with: `id`, `name`, `config`, `createdAt`, `updatedAt`, `agentCount`

### Verification
- [x] Modal opens/closes from HUD button
- [x] Create session adds to list
- [x] Save/load round-trip preserves session data
- [x] Delete removes from localStorage
- [x] Sessions persist across page refresh

---

## Component F: WebSocket Event Bus

**Status**: ✅ Implemented
**Files**: `server/src/websocket-server.ts`, `client/src/services/websocket-client.ts`, `client/src/hooks/useWebSocket.ts`, `client/src/store/useAgentStore.ts`, `client/src/store/useSessionStore.ts`, `client/src/store/useUIStore.ts`, `client/src/store/useLogStore.ts`

The real-time communication backbone connecting server processes to the client visualization. Built on the `ws` library with typed events and auto-reconnect.

### Purpose
Synchronize state between server and client in real-time. Every agent event (state change, message, question, file change) flows through the WebSocket to the client's Zustand stores, triggering reactive UI updates.

### Architecture

```
┌─────────────────┐     ws://localhost:3002     ┌─────────────────────┐
│  Server          │◄─────────────────────────►│  Client              │
│                  │                            │                      │
│  EventBus ──────►│  ── ServerEvent ──────────►│  useWebSocket hook   │
│                  │                            │       │              │
│  WebSocketServer │  ◄── ClientEvent ──────────│       ▼              │
│                  │                            │  Zustand Stores      │
└─────────────────┘                            │  ├─ useAgentStore    │
                                               │  ├─ useSessionStore  │
                                               │  ├─ useUIStore       │
                                               │  └─ useLogStore      │
                                               └─────────────────────┘
```

### Server: WebSocket Server (`websocket-server.ts`)
- Wraps `ws.Server` attached to HTTP server
- Per-connection state tracking (agent list, session ID)
- Message routing by event type:
  - `session_*` → SessionManager
  - `start_agent` / `stop_agent` / `send_input` → ProcessManager
  - `resync` → full state dump
- Broadcast helper: `broadcast(event)` sends to all connected clients
- Heartbeat: ping every 30s, timeout after 10s no pong
- Error handling: malformed messages → error response, not crash

### Client: WebSocket Client (`websocket-client.ts`)
```typescript
class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;    // Cap at 30s
  private listeners: Map<string, Set<Function>> = new Map();
  
  connect(): void;
  disconnect(): void;
  send(event: ClientEvent): void;
  on(eventType: string, callback: Function): void;
  off(eventType: string, callback: Function): void;
  
  private handleReconnect(): void;       // Exponential backoff
  private requestResync(): void;         // Full state after reconnect
  get connected(): boolean;
}
```

Auto-reconnect behavior:
1. Connection lost → wait `min(1000 * 2^attempt, 30000)` ms
2. Attempt reconnect
3. On success: request full state resync via `{ type: 'resync' }`
4. On failure: increment attempt, wait longer, retry

### Client: useWebSocket Hook (`useWebSocket.ts`)
- Connects on mount, disconnects on unmount
- Exposes `connected` boolean for UI
- Registers event listeners by type:
  - `agent_state_changed` → `useAgentStore.updateAgentState`
  - `agent_spawned` → `useAgentStore.addAgent`
  - `agent_removed` → `useAgentStore.removeAgent`
  - `agent_question` → `useAgentStore.setAgentQuestion`
  - `agent_message` → `useLogStore.addLog`
  - `agent_file_change` → `useLogStore.addFileChange`
  - `session_list` → `useSessionStore.setSessions`
  - `session_loaded` → `useAgentStore.hydrate`
- Listens for `CustomEvent('constellation:send_input')` on window → sends `send_input` over WS
- Handles connection lifecycle: `connecting`, `connected`, `disconnected`, `reconnecting`

### Client: Zustand Stores

**useAgentStore** (`useAgentStore.ts`)
```typescript
interface AgentStore {
  agents: Record<string, AgentNode>;
  edges: Record<string, AgentEdge>;
  
  addAgent: (agent: AgentNode) => void;
  removeAgent: (id: string) => void;
  updateAgentState: (id: string, state: AgentState, previous: AgentState) => void;
  setAgentQuestion: (id: string, question: Question | null) => void;
  updateAgentPosition: (id: string, position: Vec3) => void;
  hydrate: (data: { agents: AgentNode[]; edges: AgentEdge[] }) => void;
  reset: () => void;
}
```

**useUIStore** (`useUIStore.ts`)
```typescript
interface UIStore {
  selectedAgentId: string | null;
  activePanel: PanelType | null;
  panelMode: 'all' | 'selected';
  showFallback: boolean;
  
  selectAgent: (id: string | null) => void;
  setActivePanel: (panel: PanelType | null) => void;
  setPanelMode: (mode: 'all' | 'selected') => void;
  setShowFallback: (show: boolean) => void;
  reset: () => void;
}
```

**useSessionStore** (`useSessionStore.ts`)
```typescript
interface SessionStore {
  sessions: SessionSummary[];
  currentSession: SessionSummary | null;
  // ... CRUD operations
}
```

**useLogStore** (`useLogStore.ts`)
```typescript
interface LogStore {
  logs: Record<string, LogEntry[]>;
  fileChanges: FileChangeEntry[];
  memories: MemoryEntry[];
  files: FileEntry[];
  // ... add operations for each type
}
```

### Verification
- [x] Server sends events matching typed schema
- [x] Client receives events and dispatches to correct store
- [x] Auto-reconnect works: kill server → "disconnected" → restart → reconnects
- [x] Full state resync after reconnect
- [x] `tsc --noEmit` passes for both server and client

---

## Component G: Topology Engine

**Status**: ✅ Implemented
**Files**: `client/src/components/topology/TopologyEngine.ts`, `client/src/components/topology/LayoutSelector.tsx`

Layout and structural management for the 3D graph. Organizes agent nodes in four different meaningful patterns, each suited for different monitoring perspectives.

### Purpose
Provide different visual arrangements of the agent graph, each optimized for a specific use case. Switch between layouts instantly via the layout selector pills at the bottom of the 3D scene.

### Layout Modes

#### 1. Neural (Force-Directed)
- **Use case**: Default view. Shows organic relationships between agents.
- **Algorithm**: `d3-force-3d` simulation
  - `forceManyBody()`: Agents repel each other (strength varies by role)
  - `forceLink()`: Edges create spring tension between connected agents
  - `forceCenter()`: Keeps the graph centered in the scene
  - `forceCollide()`: Prevents node overlap
- **Behavior**: Active physics simulation; agents drift and settle naturally
- **Ideal for**: Getting an intuitive sense of the agent network topology

#### 2. Timeline (Chronological)
- **Use case**: Understanding the sequence of agent activity.
- **Algorithm**: Agents positioned along the X-axis by `createdAt` timestamp
  - Z-axis alternates rows based on depth level
  - Y-axis is flat (same height)
- **Behavior**: Static positions; no physics simulation
- **Ideal for**: Debugging session chronology, understanding execution flow over time

#### 3. Hierarchy (BFS Tree)
- **Use case**: Visualizing parent-child delegation chains.
- **Algorithm**: Breadth-First Search tree layout
  - Root (orchestrator) at top-center
  - Planners in the middle row
  - Workers at the bottom row
  - Children positioned horizontally under their parent
- **Behavior**: Static tree structure; orphans (parents completed/killed) get dashed borders
- **Ideal for**: Understanding the delegation structure, identifying bottlenecks

#### 4. Focus (Orbit Selected)
- **Use case**: Concentrating on a single agent's interactions.
- **Algorithm**: Selected agent at origin, all connections orbit around it
  - Connected agents at fixed radius on the equatorial plane
  - Rest of agents at larger radius, dimmed
- **Behavior**: Rotates slowly; focus agent is highlighted and enlarged
- **Ideal for**: Detailed inspection of one agent's relationships and activity

### TopologyEngine.ts

```typescript
export class TopologyEngine {
  static computeLayout(
    mode: TopologyMode,
    agents: Record<string, AgentNode>,
    edges: Record<string, AgentEdge>,
    selectedAgentId: string | null
  ): Map<string, Vec3> {
    switch (mode) {
      case 'neural':     return null; // Handled by d3-force-3d
      case 'timeline':   return computeTimelineLayout(agents);
      case 'hierarchy':  return computeHierarchyLayout(agents, edges);
      case 'focus':      return computeFocusLayout(agents, edges, selectedAgentId);
    }
  }
}
```

- Neural mode returns `null` → `ForceGraph.ts` runs the d3 simulation
- Other modes compute positions statically → positions override d3 simulation
- Integration with Cockpit: Cockpit checks topology mode and either runs ForceGraph or applies computed positions

### LayoutSelector.tsx

- Row of pill buttons at the bottom-center of the screen
- Each pill: icon + short label
- Active mode highlighted with purple (`#a78bfa`) border
- Modes: `🧠 Neural` | `⏱ Timeline` | `🌳 Hierarchy` | `🎯 Focus`
- Click dispatches to `useUIStore` → Cockpit switches topology

### Verification
- [x] All 4 modes render different layouts
- [x] Neural mode: agents drift via force simulation
- [x] Timeline mode: agents sorted by time along X axis
- [x] Hierarchy mode: tree structure by role
- [x] Focus mode: selected agent at center with orbiting neighbors
- [x] Switching modes is smooth (no visual glitches)
- [x] Layout mode persists in store when switching agents

---

## Component H: Intervention System

**Status**: ✅ Implemented
**Files**: `client/src/components/intervention/InterventionPanel.tsx`

Handling agent questions and user input. When a CLI agent encounters a permission prompt, ambiguous question, or needs user decision, the system detects it, surfaces a notification badge, and lets the user respond without interrupting other agents.

### Purpose
Enable the human-in-the-loop interaction model — the signature feature of Constellation. Agents that need input pause independently. The user sees who needs help, what they're asking, and can respond via quick-reply buttons or custom text. Other agents continue working unaffected.

### Architecture

```
Agent Process (PTY)
  ↓ stdout
AgentAdapter.parseOutput(chunk)
  ↓ "?" detected → Question { text, options?, context }
EventBus
  ↓ agent_question event
WebSocket Server → Client
  ↓
useWebSocket hook → useAgentStore.setAgentQuestion(id, question)
  ↓
AgentNode.pendingQuestion = Question
  ↓
InterventionPanel reacts:
  ├─ Floating button: badge count of waiting agents
  │    ↓ click
  └─ Slide-up panel:
       ├─ Agent selector
       ├─ Question text display
       ├─ Quick-reply buttons
       ├─ Custom text input
       └─ Submit → CustomEvent('constellation:send_input')
            ↓
       useWebSocket listener → WS send_input → ProcessManager → PTY stdin
```

### InterventionPanel.tsx

```typescript
export const InterventionPanel: React.FC = () => {
  const agents = useAgentStore((s) => s.agents);
  const waitingAgents = useMemo(() => 
    Object.values(agents).filter((a) => a.pendingQuestion),
    [agents]
  );
  
  // ... panel open/close, selected agent, input state
};
```

#### Floating Button
- Position: bottom-right corner, fixed
- Shows count of waiting agents (badge number)
- Icon: changes to "?" when agents need input
- Hidden when no agents are waiting
- Pulse animation when count > 0
- Click → slides up the panel

#### Slide-Up Panel
- Animated from bottom (`transform: translateY` with transition)
- Background: dark panel (`#0f172a`) with border
- **Agent Selector**: Dropdown/tabs for each waiting agent
- **Question Display**: Shows the exact prompt text from the agent
- **Context**: Optional section showing last N lines of terminal output
- **Quick-Reply Buttons**: Auto-generated from `question.options` (e.g., "Yes", "No", "Continue", "Skip")
- **Custom Input**: Text area for free-form responses
- **Submit Button**: Sends the answer

#### Answer Dispatch
1. User selects agent (if multiple waiting)
2. User clicks quick-reply or types custom answer
3. Submit triggers: `window.dispatchEvent(new CustomEvent('constellation:send_input', { detail: { agentId, input } }))`
4. `useWebSocket` hook catches this event
5. Sends `{ type: 'send_input', payload: { agentId, input } }` over WebSocket
6. Server process-manager writes to PTY stdin
7. Agent resumes; state changes from `waiting_for_input` back to `executing` or `idle`
8. Badge count decrements

### Key Design Decisions

- **Decoupled via CustomEvent**: The InterventionPanel doesn't need direct access to WebSocket. This makes it testable and keeps concerns separated.
- **Independent per-agent**: Multiple agents can wait simultaneously, each with their own question. Answering one doesn't affect others.
- **No blocking**: The InterventionPanel is non-modal. Users can answer at their convenience while monitoring other agents.

### Verification
- [x] Floating button shows count of waiting agents
- [x] Click opens slide-up panel
- [x] Agent selector works when multiple agents waiting
- [x] Quick-reply buttons appear from question options
- [x] Custom text input works
- [x] Submit dispatches CustomEvent
- [x] Panel closes when no agents waiting

---

## Component I: Accessibility Fallback

**Status**: ✅ Implemented
**Files**: `client/src/components/accessibility/WebGLDetector.ts`, `client/src/components/accessibility/FallbackView.tsx`, `client/src/components/accessibility/AccessibilityProvider.tsx`

Ensuring the cockpit is usable for everyone regardless of browser capabilities, device performance, or accessibility needs. Provides a complete 2D alternative to the 3D visualization with full keyboard navigation and screen reader support.

### Purpose
The 3D canvas is the primary interface, but not everyone can use it. Users with low-vision screen readers, users on devices without WebGL, users who prefer keyboard-only navigation, or users who get motion sickness from 3D scenes all need an alternative that provides the same functionality.

### Sub-components

#### WebGLDetector (`WebGLDetector.ts`)
Detects browser WebGL capabilities on mount:

```typescript
export function detectWebGL(): WebGLInfo {
  // Tries webgl2 context first, falls back to webgl1
  // Returns: { supported, renderer?, vendor?, maxTextureSize?, reason? }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- Tries `webgl2` context → if fails, tries `webgl` → if fails, returns `supported: false`
- Uses `WEBGL_debug_renderer_info` extension for renderer/vendor info
- Detects `prefers-reduced-motion` media query

#### FallbackView (`FallbackView.tsx`)
Full 2D replacement for the Cockpit. No Three.js, no canvas — just HTML/CSS with keyboard navigation:

- **Agent Cards**: Each agent is a keyboard-focusable card showing:
  - State color dot (same color mapping as 3D)
  - Agent name (truncated with ellipsis)
  - Tool type badge
  - State label
  - Alert indicator if pending question
  - Tab/Enter to select, visual focus ring

- **Selected Agent Detail**: When an agent is selected, a detail panel shows a table with all properties:
  - Name, Tool, State, Model
  - Working directory
  - Role in topology
  - 3D position coordinates
  - Creation timestamp

- **Connections List**: All edges displayed as text rows: `sourceId → targetId (type)`

- **Recent Activity**: The latest 10 log entries from useLogStore, sorted by time descending, with timestamp + agent name + text

- **Empty States**: When no agents exist, shows "No agents yet. Create a session to get started."

**Accessibility Features**:
- `role="region"` with `aria-label="Constellation 2D View"` on the container
- `role="list"` with `aria-label="Agent list"` for the agent card list
- Each agent card: `role="button"`, `aria-label`, `aria-selected`, `tabIndex`
- Full keyboard navigation (Tab through agents, Enter to select)
- Semantic HTML structure

#### AccessibilityProvider (`AccessibilityProvider.tsx`)
React context that bridges detection and UI:

```typescript
interface AccessibilityContextValue {
  webglSupported: boolean;
  webglInfo: WebGLInfo;
  reducedMotion: boolean;
  useFallback: boolean;
  setUseFallback: (use: boolean) => void;
}
```

- On mount: runs WebGL detection, reads reduced-motion preference
- Auto-enables fallback if WebGL unsupported
- `setUseFallback` allows manual toggle from HUD button
- Listens for `change` events on `prefers-reduced-motion` media query

### Integration with App.tsx

```typescript
// App.tsx
function App() {
  return (
    <AccessibilityProvider>
      <HUD />
      <Layout />
    </AccessibilityProvider>
  );
}

// Layout
const Layout: React.FC = () => {
  const { useFallback } = useAccessibility();
  if (useFallback) return <FallbackView />;
  return (
    <>
      <Cockpit />
      <PanelContainer />
      <InterventionPanel />
    </>
  );
};
```

The HUD includes a **3D/2D toggle button**: clicking it switches between immersive 3D view and accessible 2D view at any time. In 2D mode, the button label changes to "3D" and vice versa.

### Verification
- [x] WebGL detection returns correct support info
- [x] Auto-fallback when WebGL unavailable
- [x] Manual 3D/2D toggle from HUD
- [x] Agent cards keyboard-navigable (Tab/Enter)
- [x] Selected agent detail table renders
- [x] Edge connections list renders
- [x] Recent activity log renders
- [x] ARIA labels present on all interactive elements
- [x] Empty states display when no data

---

## Integration and Testing Strategy

### Phase 1: Core Connectivity

Verify that the Orchestration Server can spawn an agent and stream output to the Terminal Panel via the WebSocket Event Bus.

```
Server starts → WS connects → Start agent → PTY spawns →
Agent produces output → Adapter normalizes → EventBus emits →
WS broadcasts → Client receives → Zustand updates →
TerminalPanel shows log entry
```

**Pass criteria**: Log entry appears in TerminalPanel within 1 second of agent output.

### Phase 2: Visual Mapping

Ensure that the 3D Canvas Engine correctly renders nodes based on the server state and that the Topology Engine can arrange them.

```
Server creates agent → WS sends agent_spawned →
Client store updates → 3D scene adds node →
State changes → Node color updates → Topology arranges layout
```

**Pass criteria**: Agent node appears in 3D scene within 500ms of spawning. Color changes with state transitions.

### Phase 3: Full Loop

Test the complete flow: Start a session, launch multiple agents, trigger an intervention, provide an answer, and save the session.

```
Create session → Add agents → Start working →
Agent hits question → Badge appears → User answers →
Agent resumes → Save session → Close → Reload → Session restored
```

**Pass criteria**: Full round-trip completes without errors. Session restores identical state.

### TypeScript Verification

```bash
# All packages compile with zero errors
npm run typecheck

# Shared
cd shared && tsc --noEmit
# → zero errors

# Server
cd server && tsc --noEmit
# → zero errors

# Client
cd client && tsc --noEmit
# → zero errors
```

### Build Verification

```bash
# Production build
npm run build
# → client/dist/ (static assets)
# → server/dist/ (compiled JS)
```

### Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| 3D Scene FPS (20 agents) | ≥45 fps | ✅ Verified |
| Bundle size (gzip) | <500 KB | ~366 KB |
| Event latency (server→client) | <300 ms | Not yet measured |
| Session load time | <1 s | Not yet measured |

### Continuous Integration

- Run linting and type checks on every commit
- Execute unit tests for all logic-heavy components
- Perform visual regression tests for the 3D canvas
- Automate E2E tests for critical user paths
