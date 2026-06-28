# Constellation — Agent OS

> **Version:** 3.0 (multi-page)
> **Date:** 2026-06-22
> **Status:** Draft — iter 3 of evolving plan
> **Previous:** v1 (knowledge graph), v2 (single-canvas Agent OS)

---

## 1. Problem Statement

Developers run multiple AI CLI agents in parallel — Claude Code, Gemini CLI, OpenCode, Ollama-served local models, Hermes, Kimi, Pi — but manage them across disjoint terminals, chat apps, and dashboards. When an agent needs input, when a task is done, when a recurring pattern wastes tokens by re-deriving the same solution, the user has to notice manually and stitch it back together.

**Constellation is a multi-page Agent OS that:**

- Gives the user (the **CEO**) a single command centre for every agent they run, regardless of provider.
- Turns task management into a **Kanban** where the user drops tasks, a dispatcher picks them up, the right provider agent executes, and the user approves before anything is "done."
- Lets the user **register any provider** — built-in or new — without code changes, via a `/connect` slash command.
- **Self-evolves**: when the same task shape recurs, the system crystallises a reusable **Skill** (cached workflow) and replays it on subsequent matches, saving tokens and time.
- **Visualises everything as one living 3D graph**: agents, skills, knowledge-graph nodes, and (future) second-brain notes, all orbiting in a single constellation.

**Core pain it eliminates:** "I have 4 agents running across 3 terminals and I have no idea what they're doing, whether they need me, whether I'm wasting tokens on the same task for the fifth time, and whether I should just hire a different model."

---

## 2. Product Layers

Constellation is built from three independent layers that each have their own data model, UI surface, and lifecycle:

### 2.1 Layer 3 — CEO Kanban (task management)

The user is the CEO. The CEO creates tasks on a Kanban board. A dispatcher (single worker in v1, named-role orchestrator in Phase 2) claims tasks, asks for clarification if needed, assigns to the best-fit provider agent, monitors execution, and routes the deliverable to the CEO for approval.

| Column | Owner | Meaning |
|---|---|---|
| Backlog | CEO writes, dispatcher reads | Newly created, not yet picked up |
| Needs Clarification | CEO answers | Dispatcher needs more info to assign |
| In Progress | Worker agent | Active execution, monitored |
| Review | **CEO** | Worker done, awaiting CEO approval (no auto-approve) |
| Done | Final state | Approved + archived |

### 2.2 Layer 2 — Provider Registry (pluggable agents)

A registry of provider adapters. Built-in adapters ship with Constellation; users can add new ACP-capable providers via `/connect` without writing code.

**Built-in (v1):**

| Provider | Type | Adapter | Icon color |
|---|---|---|---|
| Ollama | Local HTTP | `server/src/providers/ollama.ts` | `#059669` green |
| Claude Code | CLI PTY | `server/src/providers/claude-code.ts` | `#d97706` amber |
| Gemini | CLI PTY | `server/src/providers/gemini.ts` | `#2566eb` blue |
| Hermes | CLI PTY | `server/src/providers/hermes.ts` | `#f97316` orange |
| OpenCode | CLI PTY | `server/src/providers/opencode.ts` | `#7c3aed` violet |
| Kimi Code CLI | ACP server | `server/src/providers/acp.ts` (kimi config) | `#ec4899` pink |
| Pi | CLI PTY | `server/src/providers/acp.ts` (pi config) | `#14b8a6` teal |

**Onboarding:** `/connect <provider>` in ⌘K command palette. Auto-detects binary, validates handshake, persists to `~/.constellation/providers.json`.

### 2.3 Layer 1 — Self-Evolution (pattern → skill → reuse)

The system observes completed tasks. When a similar task shape recurs, it crystallises a **Skill** — a cached workflow with the same step *types* and *order* as the original execution, but parameterised for new inputs. Next time a similar task arrives, the dispatcher matches it to an existing Skill (embedding similarity ≥ τ) and the worker replays the Skill instead of regenerating from scratch.

| Decision | Choice |
|---|---|
| Crystallisation timing | **Auto** if pattern success rate > 90%; **ask CEO** otherwise (Skill Genesis popover) |
| Skill execution | **Replay-as-template** — cached step types + shape, re-derived args. **LLM-fallback** if environment has swayed (cwd/file hashes/schema diff > threshold) |
| Skill visualisation | **Evolution 3D view on Genome page only** — invisible in Dashboard brain by default, invisible in all other pages |

---

## 3. Pages (multi-page architecture)

Constellation is a multi-page application using `react-router-dom` v6+. Two layout classes:

- **Bespoke** — Dashboard only, designed as a landing hero
- **Standard** — every other page, using a `PageShell` wrapper

| Route | Page | Layout | Purpose |
|---|---|---|---|
| `/` | Dashboard | Bespoke | KPI strip + AI Platforms left panel + 3D brain |
| `/kanban` | Kanban | Standard | CEO task board, 5 columns, drag-and-drop |
| `/platforms` | AI Platforms | Standard | Provider registry, `/connect`, health monitoring |
| `/genome` | Genome | Standard | Skill lineage + Evolution 3D view |
| `/tasks` | Tasks | Standard | Searchable task history |
| `/skills` | Skills | Standard | Searchable skill inventory |
| `/settings` | Settings | Standard | Workspace, theme, dispatcher, providers |

### 3.1 Dashboard (landing, bespoke)

```
┌──────────────────────────────────────────────────────────────────┐
│  TopHUD · 40px · ⌬ Constellation · ⌘K · user · ◐                │
├──────────────────────────────────────────────────────────────────┤
│  KPI STRIP · ~88px                                               │
│  [Total tasks] [Active now] [Completed] [Tokens used]            │
├──────────────┬───────────────────────────────────────────────────┤
│ AI PLATFORMS │                                                   │
│ ~260px       │         3D KNOWLEDGE-GRAPH BRAIN                  │
│              │         (interactive 3D scene)                    │
│  ● Live (4)  │                                                   │
│  ◌ Idle (1)  │   - Agent nodes (coloured by platform)            │
│  ○ Offline(2)│   - Skill nodes (orbital, small)                  │
│              │   - Knowledge graph nodes (toggled)               │
│  [+ Connect] │   - Tool nodes (MCP servers)                      │
│              │                                                   │
│  7 platforms │   Filters: [All][Agents][Skills][Files]           │
│  12 agents   │   Time: [1h][Today][Week][All]                    │
│  147 tasks   │                                                   │
├──────────────┴───────────────────────────────────────────────────┤
│  Tactical Rail · 40px · live ticker                              │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Persistent chrome (every page)

- **TopHUD (40px)** — logo glyph · global ⌘K hint · active agent count · token cost today · user menu · theme toggle.
- **TacticalRail (40px)** — horizontal ticker subscribing to all WebSocket events globally. Event categories:
  - `●` Task events (claimed, dispatched, done, approved, failed)
  - `●` Provider events (connected, disconnected, error)
  - `●` Skill events (born, fired, mutated, archived)
  - `●` Pattern events (detected, crystallised)

### 3.3 Standard page shell

```
┌──────────────────────────────────────────────────────────────────┐
│  TopHUD · 40px                                                   │
├──────────────────────────────────────────────────────────────────┤
│  PAGE HEADER · ~64px · title · subtitle · [+ Primary Action]     │
├──────────────────────────────────┬───────────────────────────────┤
│                                  │                               │
│       PAGE MAIN CONTENT          │   PAGE SIDE PANEL             │
│       (varies per page)          │   (optional, ~360px glass)    │
│                                  │                               │
├──────────────────────────────────┴───────────────────────────────┤
│  Tactical Rail · 40px                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Routing

```typescript
// client/src/router.tsx
const router = createBrowserRouter([
  {
    element: <RootLayout />,  // TopHUD + TacticalRail + <Outlet />
    children: [
      { path: '/',            element: <Dashboard /> },
      { path: '/kanban',      element: <Kanban /> },
      { path: '/platforms',   element: <Platforms /> },
      { path: '/genome',      element: <Genome /> },
      { path: '/genome/:skillId',  element: <Genome /> },
      { path: '/tasks',       element: <Tasks /> },
      { path: '/tasks/:taskId',    element: <Tasks /> },
      { path: '/skills',      element: <Skills /> },
      { path: '/skills/:skillId',  element: <Skills /> },
      { path: '/settings',    element: <Settings /> },
    ],
  },
]);
```

---

## 5. Architecture

### 5.1 System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (Vite + React 19)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RootLayout (TopHUD + TacticalRail + Outlet)               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │Dashboard │ │  Kanban  │ │Platforms │ │ Genome   │... │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Zustand stores: tasks, providers, skills, patterns, evolution  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket + REST
┌──────────────────────────┴──────────────────────────────────────┐
│                    SERVER (Express + ws)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Workers                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │  Dispatcher   │  │   Pattern    │  │ Skill Runner │    │  │
│  │  │ (claims tasks,│  │  Detector    │  │ (replay-     │    │  │
│  │  │  routes)      │  │ (clusters,   │  │ as-template  │    │  │
│  │  │               │  │  crystallises│  │ + LLM-       │    │  │
│  │  │               │  │  Skills)     │  │ fallback)    │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Providers (ProviderAdapter interface)                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │
│  │  │ Ollama  │ │  Claude │ │ Gemini  │ │ Hermes  │  ...    │  │
│  │  │  HTTP   │ │ CLI PTY │ │ CLI PTY │ │ CLI PTY │         │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │  │
│  │  ACP adapter (Kimi, Pi, future)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Stores (in-memory for v1, SQLite in v2)                   │  │
│  │  tasks · providers · skills · patterns · observations    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │   Ollama local  │ (nomic-embed-text for pattern detection)
                  └─────────────────┘
```

### 5.2 Data flow — task lifecycle

```
CEO creates task in /kanban
   ↓ POST /api/tasks
tasksStore.create()
   ↓ WebSocket: task:created
Dashboard KPI strip updates
   ↓
Dispatcher worker polls (every 2s)
   ↓
If description vague → status='needs-clarification'
   WebSocket: task:needs-clarification
   CEO sees yellow banner
   ↓
If clear → status='in-progress'
   spawn(provider, workingDir, model)
   provider.sendMessage(agentId, taskDescription)
   WebSocket: task:dispatched
   ↓
Worker executes, streams events via WebSocket
   ↓
Worker reports completion → status='review'
   WebSocket: task:review
   CEO sees card in Review column
   ↓
CEO clicks "Approve" → status='done'
   WebSocket: task:approved
   Task observation persisted
   ↓
Pattern detector runs (every 30s)
   Clusters observations, promotes to Skills
```

### 5.3 Data flow — skill crystallisation + reuse

```
Task done (status='done')
   ↓
observationsStore.append(task observation)
   ↓
Pattern detector (every 30s)
   Clusters recent observations by embedding similarity
   ↓
If cluster freq ≥ 5 + success rate > 90%
   → auto-crystallise Skill
   WebSocket: skill:created
   Skill Genesis popover (if user is on Dashboard/Kanban/etc.)
   ↓
If cluster freq ≥ 5 + success rate ≤ 90%
   → skill:pending-crystallisation
   CEO sees "Crystallise?" prompt
   ↓
Skill created, indexed by triggerEmbedding + provider
   ↓
Next similar task arrives
   ↓
Dispatcher matches task embedding against all skills
   If similarity ≥ τ → hint worker to use skill
   ↓
Worker uses skillRunner.replayAsTemplate(skill, taskArgs)
   If env swayed → LLM-fallback
   ↓
WebSocket: skill:fired
   TacticalRail: "● Skill fired: TS Refactor (sim 0.91) saved 2,847 tok (73%)"
```

---

## 6. Data Model

### 6.1 Tasks

```typescript
interface Task {
  id: string;                       // uuid
  title: string;
  description: string;              // rich text, supports @provider mentions
  status: 'backlog' | 'needs-clarification' | 'in-progress' | 'review' | 'done';
  priority: 'p0' | 'p1' | 'p2';
  platform: string | 'auto';        // provider id, or 'auto' for dispatcher to pick
  model?: string;                   // optional model override
  workspace: string;                // folder path
  assignedAgentId?: string;
  assignedProvider?: string;
  clarificationRequest?: string;   // question from dispatcher
  progress: number;                 // 0-100
  deliverable?: string;             // task result summary
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  skillFiredId?: string;            // which skill (if any) was used
  tokensUsed: number;
  observationId?: string;           // links to TaskObservation for pattern detection
}
```

### 6.2 Providers

```typescript
interface ProviderConfig {
  id: string;                       // 'claude-code', 'ollama', etc.
  binary?: string;                  // CLI binary path
  args?: string[];
  endpoint?: string;                // for HTTP providers
  env?: Record<string, string>;
  enabled: boolean;
  registeredAt: Date;
  capabilities: ProviderCapability[];
  healthStatus: 'live' | 'idle' | 'offline';
}

type ProviderCapability =
  | 'code-edit' | 'code-review' | 'terminal' | 'file-read' | 'file-write'
  | 'web-search' | 'image-gen' | 'long-context' | 'streaming'
  | 'mcp' | 'plan-mode' | 'tool-use' | 'local-runtime' | 'cloud-runtime';

interface ProviderAdapter {
  id: string;
  spawn(config: ProviderSpawnConfig): Promise<SpawnedSession>;
  sendMessage(sessionId: string, msg: AgentMessage): Promise<void>;
  streamEvents(sessionId: string): AsyncIterable<AgentEvent>;
  kill(sessionId: string): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
}
```

### 6.3 Skills

```typescript
interface TaskObservation {
  id: string;
  taskId: string;
  agentId: string;
  providerId: string;
  taskEmbedding: number[];          // nomic-embed-text vector
  toolCalls: ToolCall[];
  tokensUsed: number;
  durationMs: number;
  success: boolean;
  createdAt: Date;
}

interface Skill {
  id: string;
  name: string;                     // auto-generated, e.g. "TS Refactor: Extract Hook"
  description: string;
  providerId: string;
  triggerEmbedding: number[];       // centroid of matched observations
  similarityThreshold: number;      // τ, default 0.85
  steps: SkillStep[];               // cached step types + shape
  sourcePatternId: string;
  generation: number;               // 1 if born directly, 2+ if evolved
  parentSkillId?: string;
  usageCount: number;
  totalTokensSaved: number;
  createdAt: Date;
  lastFiredAt?: Date;
  status: 'active' | 'archived';
}

interface SkillStep {
  kind: 'tool_call' | 'llm_call' | 'file_read' | 'file_write' | 'bash';
  payloadShape: any;                // shape, not literal args (for re-derivation)
  expectedOutputShape?: string;
}

interface SkillTrigger {
  id: string;
  skillId: string;
  matchedTaskId: string;
  similarityScore: number;
  tokensSaved: number;
  timestamp: Date;
}
```

### 6.4 Patterns

```typescript
interface DetectedPattern {
  id: string;
  observationIds: string[];
  centroidEmbedding: number[];
  frequency: number;
  avgTokens: number;
  successRate: number;
  status: 'observing' | 'pending-crystallisation' | 'crystallised' | 'rejected';
  detectedAt: Date;
}
```

---

## 7. UX Moments (acceptance criteria for "done")

The product is "done" when all 7 of these moments feel right on the first try:

1. **Dashboard empty** — opens Constellation, sees 0/0/0/0 KPIs with a 3D brain showing a glowing centre node "**Constellation OS online**". TacticalRail reads "○ 0 platforms connected · 0 agents · 0 tasks."

2. **First provider connect** — `/connect claude-code` in ⌘K. Auto-detects `claude` binary, validates handshake, chip turns grey → amber → green. TacticalRail: "● Provider connected: Claude Code · 1 agent spawned." Dashboard AI Platforms panel updates live.

3. **First task** — `/kanban`, click + New Task, type "Refactor auth middleware to use JWT". Card slides into Backlog. Within 2s dispatcher claims it (description is rich enough). Card moves to In Progress, Kimi chip pulses cyan. TacticalRail: "● Task #1 dispatched to Kimi."

4. **Task done** — worker reports back. Card moves to **Review** (NOT Done — CEO approval required). TacticalRail: "● Task #1 awaiting CEO review · 3 files changed · 4.2k tokens."

5. **First skill crystallises** — after 5 similar refactor tasks, Skill Genesis popover slides in globally (visible on whichever page the CEO is on). "✨ New skill: TS Refactor (Kimi) — will save ~68% on next match." Dashboard 3D brain shows the skill node being born.

6. **Skill fires** — next similar task arrives. Dispatcher routes, worker uses replay-as-template. TacticalRail: "● Skill fired: TS Refactor (sim 0.91) saved 2,847 tok (73%)." Genome page Evolution 3D view (if CEO navigates) shows the skill node pulsing.

7. **Multi-page flow** — CEO navigates Dashboard → Kanban (creates task) → Platforms (connects provider) → Genome (inspects skill lineage) → Settings (tunes dispatcher). TopHUD + TacticalRail persist, so live events never missed.

---

## 8. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Client | Vite + React 19 | Frontend |
| Client routing | react-router-dom v6+ | Multi-page architecture |
| DnD | @dnd-kit/core | Kanban drag-and-drop |
| 3D | Three.js + React Three Fiber | Agent / skill / brain visualisation |
| 2D Graph | react-force-graph-2d | Force-directed graph |
| State | Zustand | Client stores |
| Styling | Tailwind CSS v4 | Utility-first |
| Icons | Lucide | UI iconography |
| Server | Express 5 + ws | API + WebSocket |
| Server runtime | node-pty | CLI provider adapters |
| Provider adapter | Custom ProviderAdapter interface | Pluggable agents |
| ACP | Custom adapter | Kimi, Pi, future |
| Embeddings | Ollama `nomic-embed-text` | Pattern detection |
| Persistence (v2) | SQLite | Tasks, providers, skills, patterns |

---

## 9. Out of Scope (v1)

| Deferred to | Feature |
|---|---|
| Phase 2 | Named-role orchestrator (CTO / CMO / SEO / Security Director routing) |
| Phase 2 | LLM-based task routing (v1 uses keyword heuristics) |
| Phase 2 | Cross-agent skill sharing |
| Phase 2 | User-authored Skills UI |
| Phase 2 | Skill marketplace / cross-instance sharing |
| Phase 2 | Second-brain integration into Dashboard 3D brain (Option B is the north star) |
| Phase 3 | Mobile responsive |
| Phase 3 | Cloud sync |

---

## 10. Success Criteria

| Metric | Target |
|---|---|
| `npm run dev` startup | < 5s |
| Dashboard 3D brain renders | < 2s with 100 entities |
| Task creation → dispatcher claim | < 3s |
| Provider connect (`/connect`) | < 10s end-to-end |
| Skill crystallisation latency | < 30s after 5th similar task |
| Token savings from skill reuse | ≥ 50% on matched tasks |
| Page transitions (router) | < 200ms |
| TacticalRail event delivery | < 500ms from server emit to UI render |

---

## 11. Implementation Phases

13 phases. Full breakdown in `docs/PLAN.md`.

| # | Phase | Time |
|---|---|---|
| 0 | SPEC.md rewrite (iter 3) | 30 min |
| 1 | Routing + page skeleton + TopHUD + TacticalRail | 2-3h |
| 2 | Aesthetic foundation (Observatory palette + fonts) | 2-3h |
| 3 | Dashboard bespoke layout (KPI strip + platforms panel + 3D brain) | 4-5h |
| 4 | Server data model (5 stores + WS events) | 3-4h |
| 5 | Client stores (5 Zustand stores) | 1-2h |
| 6 | Provider Registry backend (interface + 7 adapters) | 4-5h |
| 7 | AI Platforms page (grid + /connect UX) | 2-3h |
| 8 | CEO Kanban page (5 columns + task modal + DnD) | 4-5h |
| 9 | Dispatcher worker (claim + clarify + route) | 3-4h |
| 10 | Genome page + Evolution 3D | 4-5h |
| 11 | Tasks + Skills + Settings pages | 4-5h |
| 12 | Polish + screenshots + README | 2-3h |
| **Total** | | **~36-44h** |

---

## 12. Neural Brain (Decision Locked 2026-06-23)

### 12.1 Why
The Dashboard's 3D hero and the Knowledge Graph view both currently render a placeholder `ForceGraph` sphere of 50 random dots. That was a stub to validate the R3F `<Canvas>` plumbing. The real visual target is an **obsidian-vault neural brain**: a glowing, force-directed graph of semantic relationships between the user's second-brain artefacts (notes, agents, skills, files), with neural-brain atmosphere (glow, pulse, depth, additive blending).

### 12.2 Locked Decisions
1. **Data source: the second brain itself.** Every provider logs events to `/brain/event`; the server embeds + indexes them; the graph is the resulting node + edge network. The hero and the Knowledge Graph view render the same data.
2. **Visual treatment: obsidian-vault style, neural atmosphere.** Force-directed graph with glowing instanced-mesh nodes and additive-blended edges over `#07091a`. Cyan→violet gradient, slow auto-rotate, OrbitControls.
3. **No third party auth or external LLM calls** at data-load time. Embedding adapter supports local LM Studio via OpenAI-compat; falls back to deterministic mock for tests.

### 12.3 Data Model (shared)
- `BrainNode { id: string; label: string; kind: 'note'|'agent'|'skill'|'file'; weight: number; lastActive: number; embedding?: number[] }`
- `BrainEdge { id: string; source: string; target: string; kind: 'references'|'tagged'|'parent'|'created'|'uses'; weight: number }`
- `LogEvent { provider: string; kind: string; payload: unknown; ts: number }` (any provider can `POST /brain/event`)

Server endpoints:
- `GET /brain/nodes` → `BrainNode[]`
- `GET /brain/edges` → `BrainEdge[]`
- `POST /brain/event` → `{ id, ok: true }`

### 12.4 Component (`client/src/components/brain/NeuralBrain.tsx`)
Layers in scene-graph order:
1. **Background particle field** — 800 drifting points (drei `Points`), slow alpha breath.
2. **Edge layer** — `LineSegments` with `AdditiveBlending`, opacity by weight, cyan→violet gradient per-edge.
3. **Node layer** — `InstancedMesh` of small spheres, emissive per-instance; size `1 + weight * 1.5`.
4. **Label layer** — drei `Text` sprites, only shown on hover (raycast).
5. **OrbitControls** with `enableDamping`, capped polar range so you can't flip upside-down.
6. **Activity pulse** — in `useFrame`, nodes whose `lastActive < 8s` pulse to 1.2× scale.

Force layout: reuse existing `client/src/components/ForceGraph.ts` (d3-force-3d) — run one step per frame inside `useFrame`. Cap at 500 nodes; LOD-skip edges > 80 units away.

### 12.5 Wiring
- `KnowledgeGraphView` and `KnowledgeGraph3D` both swap from `<Canvas><ForceGraph /></Canvas>` to `<NeuralBrain />` (which owns its own `Canvas`).
- `client/src/components/ForceGraph.tsx` (the placeholder) — **deleted**.
- `useBrainStore` (zustand) holds `nodes[]`, `edges[]`, `setBrainData`, triggered by `GET /brain/nodes` + `GET /brain/edges` on app mount.

### 12.6 Verification (mandatory before declaring done)
Playwright integration suite under `test-results/neural-brain-verify/`:
1. Boot Vite dev server.
2. Mock `/brain/nodes` + `/brain/edges` with deterministic 60-node fixture via `page.route()`.
3. Visit `http://localhost:5173/`, wait 3 s for force layout to settle, screenshot.
4. Hover a node — screenshot with label.
5. Drag on canvas — screenshot showing orbit rotation.
6. Assert `consoleErrors` contains zero `R3F: Hooks` patterns and one (and only one) `<canvas>` element.
7. Deliver screenshots + `report.json` back to the orchestrator.

### 12.7 Out of Scope (explicit)
- Real embedding model wiring (LM Studio) — adapter hook only.
- Per-provider event-logging integrations (Claude Code, Gemini, OpenCode, Hermes) — separate task; only the endpoint contract ships here.
- UI work outside the 3D hero / knowledge graph views.

