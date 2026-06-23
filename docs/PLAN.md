# Constellation — Implementation Plan

> **Spec:** `docs/SPEC.md` (v3.0 — multi-page Agent OS, iter 3)
> **Working directory:** `C:\Users\padar\Desktop\constellation`
> **Iteration model:** Each iteration: update SPEC.md → implement → review → next iteration.

---

## Phase 1: Routing + Page Skeleton + Persistent Chrome

**Goal:** Stand up the multi-page architecture with persistent TopHUD + TacticalRail on every page. Seven empty pages routed. No business logic yet — just the shell.

### Tasks

- [ ] **1.1** Install `react-router-dom` v6+ in client
- [ ] **1.2** Create `client/src/router.tsx` with route definitions (see SPEC §4)
- [ ] **1.3** Create `client/src/components/layout/RootLayout.tsx` — TopHUD + TacticalRail + `<Outlet />`
- [ ] **1.4** Create `client/src/components/layout/TopHUD.tsx` (initial — brand glyph, ⌘K hint, theme toggle, user menu placeholder)
- [ ] **1.5** Create `client/src/components/layout/TacticalRail.tsx` (initial — empty ticker, ready for WS events)
- [ ] **1.6** Create `client/src/components/layout/PageShell.tsx` — wraps non-Dashboard pages
- [ ] **1.7** Create 7 empty page files: `Dashboard.tsx`, `Kanban.tsx`, `Platforms.tsx`, `Genome.tsx`, `Tasks.tsx`, `Skills.tsx`, `Settings.tsx`
- [ ] **1.8** Rewrite `App.tsx` to use `RouterProvider`
- [ ] **1.9** Verify all 7 routes load + TopHUD + TacticalRail persistent on each

**Files to create/modify:**
```
client/
├── package.json                    # MODIFY: add react-router-dom
├── src/
│   ├── App.tsx                     # REWRITE: RouterProvider
│   ├── router.tsx                  # NEW
│   ├── components/
│   │   └── layout/
│   │       ├── RootLayout.tsx      # NEW
│   │       ├── TopHUD.tsx          # NEW
│   │       ├── TacticalRail.tsx    # NEW
│   │       └── PageShell.tsx       # NEW
│   └── pages/
│       ├── Dashboard.tsx           # NEW (placeholder)
│       ├── Kanban.tsx              # NEW (placeholder)
│       ├── Platforms.tsx           # NEW (placeholder)
│       ├── Genome.tsx              # NEW (placeholder)
│       ├── Tasks.tsx               # NEW (placeholder)
│       ├── Skills.tsx              # NEW (placeholder)
│       └── Settings.tsx            # NEW (placeholder)
```

**Verification:**
- `npm run dev:client` boots
- Navigate to `/`, `/kanban`, `/platforms`, `/genome`, `/tasks`, `/skills`, `/settings` — each loads
- TopHUD + TacticalRail visible on every page
- URL changes on navigation

---

## Phase 2: Aesthetic Foundation — "Observatory"

**Goal:** Apply the Observatory visual language: new color tokens, drop Inter, add Space Grotesk + Instrument Serif, Lucide icons.

### Tasks

- [ ] **2.1** Install `lucide-react` in client
- [ ] **2.2** Add Google Fonts (Space Grotesk, Instrument Serif, JetBrains Mono) to `client/index.html`
- [ ] **2.3** Update `client/tailwind.config.ts` font family stack
- [ ] **2.4** Rewrite `client/src/styles/theme.css` with Observatory palette:
  - `--color-bg-primary: #07091a`
  - `--color-bg-secondary: #0d1124`
  - `--color-bg-tertiary: #161a30`
  - `--color-bg-elevated: #1a1f3a`
  - `--color-text-primary: #f0f2ff`
  - `--color-text-secondary: #a8b0d0`
  - `--color-text-tertiary: #6b7299`
  - `--color-accent-cyan: #06b6d4`
  - `--color-accent-violet: #8b5cf6`
  - `--color-agent-claude: #d97706` (preserved)
  - `--color-agent-gemini: #2566eb` (preserved)
  - `--color-agent-opencode: #7c3aed` (preserved)
  - `--color-agent-ollama: #059669` (preserved)
  - `--color-agent-hermes: #f97316`
  - `--color-agent-kimi: #ec4899`
  - `--color-agent-pi: #14b8a6`
- [ ] **2.5** Add gradient + glass utility classes:
  - `.bg-glass` — `backdrop-blur-xl bg-white/[0.04] border border-white/[0.06]`
  - `.text-gradient-accent` — `bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent`
- [ ] **2.6** Replace SVG chevrons and emoji icons with Lucide equivalents in TopHUD
- [ ] **2.7** Visual QA — confirm Observatory look on all 7 pages

**Files to modify:**
```
client/
├── package.json                    # MODIFY: add lucide-react
├── index.html                      # MODIFY: add Google Fonts links
├── tailwind.config.ts              # MODIFY: new fonts
└── src/
    └── styles/theme.css            # REWRITE: Observatory palette
```

**Verification:**
- All 7 pages now use the dark navy + cyan/violet palette
- Inter gone, Space Grotesk visible in headers
- Lucide icons render correctly
- Glass surfaces have backdrop-blur effect

---

## Phase 3: Dashboard Bespoke Layout

**Goal:** Build the Dashboard as the landing page with KPI strip, AI Platforms left panel, and 3D brain.

### Tasks

- [ ] **3.1** Create `KPIStrip.tsx` — 4 cards (Total tasks, Active now, Completed, Tokens used), Space Grotesk numerals, gradient borders
- [ ] **3.2** Create `AIPlatformsPanel.tsx` — left rail with provider chips grouped by status (Live/Idle/Offline), `[+ Connect]` button at bottom
- [ ] **3.3** Repurpose `Cockpit.tsx` as `KnowledgeGraph3D.tsx` (Dashboard's 3D brain) — same Three.js scene with new default filters and platform-coloured nodes
- [ ] **3.4** Add filter bar above 3D brain: `[All] [Agents] [Skills] [Files]` and `[1h] [Today] [Week] [All]`
- [ ] **3.5** Wire Dashboard to `useTaskStore` (count tasks by status) — for now, use mock data; real data lands in Phase 4
- [ ] **3.6** Wire Dashboard to `useProviderStore` (count live providers, list chips) — mock for now
- [ ] **3.7** Visual QA — confirm Dashboard looks like a command-centre landing

**Files to create:**
```
client/src/
├── pages/Dashboard.tsx             # REWRITE: real layout
└── components/dashboard/
    ├── KPIStrip.tsx                # NEW
    ├── AIPlatformsPanel.tsx        # NEW
    └── KnowledgeGraph3D.tsx        # NEW (renamed from Cockpit.tsx)
```

**Verification:**
- Dashboard at `/` shows 4 KPI cards, left platforms panel, 3D brain in centre
- KPI numbers animate in
- Platform chips show green/amber/grey status
- 3D brain renders with mock agents

---

## Phase 4: Server Data Model + WebSocket Events

**Goal:** Stand up all server-side stores (in-memory for v1) and expand the WebSocket protocol with new event types.

### Tasks

- [ ] **4.1** Create `server/src/store/tasks.ts` — Task CRUD, status transitions, queue helpers
- [ ] **4.2** Create `server/src/store/providers.ts` — ProviderConfig CRUD, load/save `~/.constellation/providers.json`
- [ ] **4.3** Create `server/src/store/skills.ts` — Skill CRUD, similarity lookup
- [ ] **4.4** Create `server/src/store/patterns.ts` — DetectedPattern CRUD
- [ ] **4.5** Create `server/src/store/taskObservations.ts` — append-only task log
- [ ] **4.6** Add type definitions to `shared/src/types/`:
  - `task.ts`, `provider.ts`, `skill.ts`, `pattern.ts`, `observation.ts`
- [ ] **4.7** Expand `server/src/websocket-server.ts` with new event types (see SPEC §5.2, §5.3)
- [ ] **4.8** Add REST endpoints:
  - `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`
  - `GET /api/providers`, `POST /api/providers`, `DELETE /api/providers/:id`
  - `GET /api/skills`, `GET /api/patterns`, `GET /api/stats` (for KPI strip)
- [ ] **4.9** Update `client/src/hooks/useWebSocket.ts` to handle new event types

**Files to create:**
```
server/src/store/
├── tasks.ts                        # NEW
├── providers.ts                    # NEW
├── skills.ts                       # NEW
├── patterns.ts                     # NEW
└── taskObservations.ts             # NEW

shared/src/types/
├── task.ts                         # NEW
├── provider.ts                     # NEW
├── skill.ts                        # NEW
├── pattern.ts                      # NEW
└── observation.ts                  # NEW

server/src/
├── websocket-server.ts             # MODIFY: new events
└── api.ts                          # NEW (or MODIFY existing)

client/src/hooks/
└── useWebSocket.ts                 # MODIFY: new event handlers
```

**Verification:**
- All REST endpoints return correct shape
- WebSocket events flow end-to-end
- Mock data visible in Dashboard KPI strip from real server

---

## Phase 5: Client Stores

**Goal:** 5 new Zustand stores with WebSocket subscriptions.

### Tasks

- [ ] **5.1** Create `useTaskStore.ts` — task list, KPIs derived (total/active/done/tokens), CRUD actions
- [ ] **5.2** Create `useProviderStore.ts` — provider list, connect/disconnect actions, health polling
- [ ] **5.3** Create `useSkillStore.ts` — skill list, fire/match actions, archive
- [ ] **5.4** Create `usePatternStore.ts` — detected patterns, crystallise action
- [ ] **5.5** Create `useEvolutionStore.ts` — derived stats (tokens saved today, skills born, patterns detected)
- [ ] **5.6** Hook all stores to WebSocket events in `RootLayout.tsx`

**Files to create:**
```
client/src/store/
├── useTaskStore.ts                 # NEW
├── useProviderStore.ts             # NEW
├── useSkillStore.ts                # NEW
├── usePatternStore.ts              # NEW
└── useEvolutionStore.ts            # NEW
```

**Verification:**
- Dashboard KPI strip shows live counts from server
- TacticalRail receives events and renders them
- All stores can be inspected via React DevTools

---

## Phase 6: Provider Registry Backend

**Goal:** `ProviderAdapter` interface + 7 adapter implementations.

### Tasks

- [ ] **6.1** Create `server/src/providers/base.ts` — `ProviderAdapter` interface, `ProviderSpawnConfig`, `AgentMessage`, `AgentEvent`, `ProviderHealth` types
- [ ] **6.2** Create `server/src/providers/registry.ts` — load `~/.constellation/providers.json`, instantiate adapters
- [ ] **6.3** Create `server/src/providers/ollama.ts` — HTTP adapter (`POST http://localhost:11434/api/chat`)
- [ ] **6.4** Create `server/src/providers/claude-code.ts` — PTY adapter wrapping `claude` binary
- [ ] **6.5** Create `server/src/providers/gemini.ts` — PTY adapter wrapping `gemini` binary
- [ ] **6.6** Create `server/src/providers/hermes.ts` — PTY adapter wrapping `hermes` binary
- [ ] **6.7** Create `server/src/providers/opencode.ts` — PTY adapter wrapping `opencode` binary
- [ ] **6.8** Create `server/src/providers/acp.ts` — generic ACP adapter (Kimi, Pi, future)
- [ ] **6.9** Add `POST /api/providers/connect` endpoint — accepts provider id, auto-detects, registers
- [ ] **6.10** Add health-check worker (polls each provider every 30s)

**Files to create:**
```
server/src/providers/
├── base.ts                         # NEW
├── registry.ts                     # NEW
├── ollama.ts                       # NEW
├── claude-code.ts                  # NEW
├── gemini.ts                       # NEW
├── hermes.ts                       # NEW
├── opencode.ts                     # NEW
└── acp.ts                          # NEW
```

**Verification:**
- `POST /api/providers/connect` with `{ id: 'claude-code' }` succeeds if binary present
- Health check updates `useProviderStore` chips live

---

## Phase 7: AI Platforms Page

**Goal:** `/platforms` page with provider grid, capabilities, and `/connect` UX.

### Tasks

- [ ] **7.1** Create `Platforms.tsx` page using `PageShell`
- [ ] **7.2** Create `ProviderGrid.tsx` — grid of provider cards
- [ ] **7.3** Create `ProviderCard.tsx` — icon, name, status, capabilities count, `[Connect]`/`[Disconnect]` button
- [ ] **7.4** Create `ConnectCommand.tsx` — `/connect` flow accessible via ⌘K palette and Platforms page header button
- [ ] **7.5** Create `ProviderDetailPanel.tsx` — side panel with full capabilities, env vars, spawned agents, recent tasks
- [ ] **7.6** Wire to `useProviderStore`

**Files to create:**
```
client/src/
├── pages/Platforms.tsx             # REWRITE: real page
└── components/platforms/
    ├── ProviderGrid.tsx            # NEW
    ├── ProviderCard.tsx            # NEW
    ├── ConnectCommand.tsx          # NEW
    └── ProviderDetailPanel.tsx     # NEW
```

**Verification:**
- `/platforms` shows 7 provider cards
- Clicking a card opens detail panel
- `/connect claude-code` in ⌘K works end-to-end

---

## Phase 8: CEO Kanban Page

**Goal:** `/kanban` with 5 columns, drag-and-drop, task creation modal.

### Tasks

- [ ] **8.1** Install `@dnd-kit/core` in client
- [ ] **8.2** Create `Kanban.tsx` page using `PageShell`
- [ ] **8.3** Create `KanbanBoard.tsx` — 5-column grid with DnD context
- [ ] **8.4** Create `KanbanColumn.tsx` — column header + droppable area
- [ ] **8.5** Create `KanbanCard.tsx` — task card with priority indicator, platform chip, progress
- [ ] **8.6** Create `TaskCreateModal.tsx` — title, description, platform, model, priority, workspace
- [ ] **8.7** Create `TaskDetailPanel.tsx` — side panel with task details, deliverable, `[Approve]` button (Review column)
- [ ] **8.8** Wire DnD to `useTaskStore.updateStatus`
- [ ] **8.9** Wire task creation to `POST /api/tasks`

**Files to create:**
```
client/src/
├── pages/Kanban.tsx                # REWRITE: real page
└── components/kanban/
    ├── KanbanBoard.tsx             # NEW
    ├── KanbanColumn.tsx            # NEW
    ├── KanbanCard.tsx              # NEW
    ├── TaskCreateModal.tsx         # NEW
    └── TaskDetailPanel.tsx         # NEW
```

**Verification:**
- `/kanban` shows 5 columns
- Drag a card from Backlog to In Progress → status updates on server
- + New Task opens modal, submits, card appears in Backlog
- Task in Review shows `[Approve]` button → click moves to Done

---

## Phase 9: Dispatcher Worker

**Goal:** Server-side dispatcher that claims tasks, routes to providers, monitors execution.

### Tasks

- [ ] **9.1** Create `server/src/workers/dispatcher.ts` — polling loop
- [ ] **9.2** Implement vague-description heuristic (word count, missing platform, no clear deliverable)
- [ ] **9.3** Implement provider selection by capability (keyword heuristic in v1)
- [ ] **9.4** Implement spawn-and-send flow using `ProviderAdapter`
- [ ] **9.5** Implement status transitions (Backlog → In Progress → Review)
- [ ] **9.6** Emit WebSocket events for every transition
- [ ] **9.7** Wire to task store status changes

**Files to create:**
```
server/src/workers/
└── dispatcher.ts                   # NEW
```

**Verification:**
- Create a task with rich description → dispatcher picks within 2s → spawns agent
- Create a task with one-word description → moves to Needs Clarification with auto-question
- Worker completion moves task to Review, NOT Done (CEO approval required)

---

## Phase 10: Genome Page + Evolution 3D

**Goal:** `/genome` page with skill lineage visualised as a 3D phylogenetic tree.

### Tasks

- [ ] **10.1** Create `Genome.tsx` page using `PageShell`
- [ ] **10.2** Create `Evolution3D.tsx` — Three.js scene rendering skills as nodes, parent→child edges for mutations
- [ ] **10.3** Skill node sizing by usage, colouring by generation
- [ ] **10.4** Birth animation when new skill crystallises
- [ ] **10.5** Pulse animation on currently-firing skills
- [ ] **10.6** Create `SkillDetailPanel.tsx` — side panel with name, trigger pattern, generation, usage, tokens saved, steps
- [ ] **10.7** `[View lineage]` filter — show only this skill's ancestry/descendants
- [ ] **10.8** `[Archive]` action

**Files to create:**
```
client/src/
├── pages/Genome.tsx                # REWRITE: real page
└── components/genome/
    ├── Evolution3D.tsx             # NEW
    └── SkillDetailPanel.tsx        # NEW
```

**Verification:**
- `/genome` renders skill lineage as 3D tree
- Click a skill → detail panel opens
- New skills appear with birth animation when `skill:created` event fires

---

## Phase 11: Tasks + Skills + Settings Pages

**Goal:** Remaining three pages — searchable history + settings.

### Tasks

#### Tasks page

- [ ] **11.1** Create `Tasks.tsx` page
- [ ] **11.2** Create `TaskTable.tsx` — columns: ID, title, platform, agent, status, duration, tokens, skill fired
- [ ] **11.3** Add search + filters (status, platform, date range)
- [ ] **11.4** Create `TaskExecutionTrace.tsx` — for selected task, show LLM calls + tool calls timeline

#### Skills page

- [ ] **11.5** Create `Skills.tsx` page
- [ ] **11.6** Create `SkillGrid.tsx` — flat card grid of all skills (vs Genome's tree view)
- [ ] **11.7** Add search + filters (provider, generation, status)

#### Settings page

- [ ] **11.8** Create `Settings.tsx` page with tabs
- [ ] **11.9** Workspace tab — root folder picker, change workspace
- [ ] **11.10** Theme tab — light/dark/auto + Observatory customisations
- [ ] **11.11** Providers tab — advanced per-provider config (binary path, env vars)
- [ ] **11.12** Dispatcher tab — pattern threshold, similarity τ, auto-crystallise toggle
- [ ] **11.13** Skills tab — similarity threshold, max generations, archive policy
- [ ] **11.14** About tab — version, links, docs

**Files to create:**
```
client/src/
├── pages/
│   ├── Tasks.tsx                   # REWRITE: real page
│   ├── Skills.tsx                  # REWRITE: real page
│   └── Settings.tsx                # REWRITE: real page
└── components/
    ├── tasks/
    │   ├── TaskTable.tsx           # NEW
    │   └── TaskExecutionTrace.tsx  # NEW
    ├── skills/
    │   └── SkillGrid.tsx           # NEW
    └── settings/
        └── (tabs inside Settings.tsx)
```

**Verification:**
- `/tasks` shows full task history with filters
- `/skills` shows flat skill inventory
- `/settings` tabs all functional

---

## Phase 12: Pattern Detector + Skill Runner (Server)

**Goal:** Close the self-evolution loop server-side.

### Tasks

- [ ] **12.1** Create `server/src/workers/pattern-detector.ts` — embedding-based clustering of recent task observations
- [ ] **12.2** Implement frequency + success rate computation
- [ ] **12.3** Implement auto-crystallisation when success > 90%
- [ ] **12.4** Implement pending-crystallisation event when success ≤ 90%
- [ ] **12.5** Create `server/src/workers/skill-runner.ts` — replay-as-template + LLM-fallback
- [ ] **12.6** Implement env-swayed detection (cwd/file hashes/schema diff)
- [ ] **12.7** Wire to dispatcher (skill hint when matching task)

**Files to create:**
```
server/src/workers/
├── pattern-detector.ts             # NEW
└── skill-runner.ts                 # NEW
```

**Verification:**
- 5 similar tasks → Skill Genesis popover (or auto-crystallise)
- Next similar task → dispatcher matches skill → worker uses replay-as-template
- TacticalRail shows token savings

---

## Phase 13: Polish + Screenshots + README

**Goal:** All 7 UX moments land cleanly. Update README with new architecture, screenshots, and migration notes.

### Tasks

- [ ] **13.1** UX Moment 1 — Dashboard empty state polished
- [ ] **13.2** UX Moment 2 — `/connect claude-code` flow
- [ ] **13.3** UX Moment 3 — First task dispatch
- [ ] **13.4** UX Moment 4 — Task to Review (not Done)
- [ ] **13.5** UX Moment 5 — Skill Genesis popover global
- [ ] **13.6** UX Moment 6 — Skill fire + savings badge
- [ ] **13.7** UX Moment 7 — Multi-page navigation preserves TacticalRail
- [ ] **13.8** Take screenshots of every page
- [ ] **13.9** Rewrite README.md with new architecture diagram + screenshots
- [ ] **13.10** Add `docs/MIGRATION_v1_to_v3.md` for existing users

**Verification:**
- All 7 UX moments pass acceptance criteria from SPEC §7
- README reflects v3 reality
- npm run lint + typecheck + build all pass

---

## Phase Dependency Graph

```
Phase 1 (Routing + Skeleton)
   │
   ├──► Phase 2 (Aesthetic)
   │        │
   │        ├──► Phase 3 (Dashboard bespoke)
   │        │
   │        ├──► Phase 7 (Platforms page)
   │        │        │
   │        │        └──► Phase 6 (Provider Registry backend)
   │        │
   │        ├──► Phase 8 (Kanban page)
   │        │        │
   │        │        └──► Phase 9 (Dispatcher worker)
   │        │                 │
   │        │                 └──► Phase 12 (Pattern Detector + Skill Runner)
   │        │
   │        └──► Phase 10 (Genome page)
   │
   └──► Phase 4 (Server data model)
            │
            ├──► Phase 5 (Client stores)
            │
            └──► Phase 11 (Tasks + Skills + Settings pages)
                     │
                     └──► Phase 13 (Polish + README)
```

---

## Estimated Effort

| Phase | Time |
|---|---|
| 1 | 2-3h |
| 2 | 2-3h |
| 3 | 4-5h |
| 4 | 3-4h |
| 5 | 1-2h |
| 6 | 4-5h |
| 7 | 2-3h |
| 8 | 4-5h |
| 9 | 3-4h |
| 10 | 4-5h |
| 11 | 4-5h |
| 12 | 3-4h |
| 13 | 2-3h |
| **Total** | **~36-44h** |
