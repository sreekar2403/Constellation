# Constellation — Agent OS

> **A multi-page Agent Operating System that crystallises recurring tasks into reusable Skills.**

Constellation is a self-evolving multi-agent control plane. It manages a registry of
AI CLI providers (Claude Code, Gemini, Ollama, Hermes, OpenCode, ACP), routes CEO-scoped
tasks through a dispatcher, and **learns from completed work** — when the same pattern
of task observations recurs, it auto-crystallises the workflow into a Skill that future
tasks can replay instead of re-prompting the LLM.

This is **not** an IDE. It is an **Observatory** — a deep-space command surface for
seeing, steering, and shaping a fleet of agents across their full lifecycle.

---

## ✨ What it does

| Layer | What you see |
|-------|--------------|
| **Provider Registry** | A live health-checked roster of every CLI agent on your machine. `/connect` onboarding, capability badges, latency. |
| **CEO Kanban** | A 5-column board (Backlog → Needs Clarification → In Progress → Review → Done). Drag tasks. Real approval gate — no auto-approve. |
| **Tasks** | A searchable history of every task ever run — with filters, agent traces, and skill-fire indicators. |
| **Genome** | A 3D phylogenetic tree of every Skill the system has crystallised. See lineage, generations, and active firings. |
| **Skills** | A flat searchable inventory of all Skills (crystallised + manually authored). |
| **Settings** | Workspace path, theme, provider config, dispatcher thresholds, skill similarity. |

---

## 🔁 The Self-Evolution Loop

```
Task completed
     ↓
Pattern Detector clusters the task's observation embedding
     ↓
If freq ≥ 5 + success ≥ 90% → auto-crystallise into a Skill
If freq ≥ 5 + success < 90% → queue for CEO review
     ↓
Skill stored with the pattern's centroid as trigger embedding
     ↓
Next similar task → dispatcher matches skill → injects steps as prompt hint
     ↓
If skill fires → record tokens saved
```

This is **not** DGM (Darwin Gödel Machine). It is **deterministic crystallisation**:
patterns are observed, not evolved; Skills are stored templates, not mutated agents.

---

## 🧭 Pages (iter 3, June 2026)

```
/              → Dashboard (landing) — KPI strip + 3D brain + AI platforms panel
/kanban        → CEO Kanban — 5-column board with drag-and-drop
/platforms     → AI Platforms — provider registry, /connect UX
/genome        → Skills Genome — 3D skill lineage
/tasks         → Task history — searchable, filterable
/skills        → Skill inventory — flat grid
/settings      → Settings — workspace, theme, providers, dispatcher, skills, about
```

Persistent across all pages: **TopHUD** (40px nav bar) + **TacticalRail** (40px ticker at bottom).

---

## 🚀 Quick Start

```bash
# Install dependencies (uses npm workspaces)
cd constellation
npm install

# Run the full stack (server on :3001, client on :5173)
npm run dev

# Or run them separately
npm run dev:server    # http://localhost:3001  (Express + WS)
npm run dev:client    # http://localhost:5173  (Vite + React 19)

# Build for production
npm run build

# Type-check everything
npm run typecheck
```

---

## 🧪 Verifying the Self-Evolution Loop

You can trigger pattern detection manually with seed observations:

```bash
# 1. Seed 5 similar successful task observations
for i in 1 2 3 4 5; do
  curl -X POST http://localhost:3001/api/observations \
    -H "Content-Type: application/json" \
    -d '{"taskId":"t'$i'","agentId":"a'$i'","providerId":"claude-code","toolCalls":[{"kind":"llm_call","payloadShape":{}}],"tokensUsed":1200,"durationMs":5000,"success":true,"taskEmbedding":[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]}'
done

# 2. Trigger pattern detection (also runs every 60s in the background)
curl -X POST http://localhost:3001/api/patterns/detect

# 3. Inspect patterns
curl http://localhost:3001/api/patterns
# → status: "crystallised" if success ≥ 90%

# 4. Inspect auto-crystallised skills
curl http://localhost:3001/api/skills
# → name: "claude-pattern-844f18d7", steps derived from observation tool calls
```

---

## 🧱 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite + Three.js)                       │
│                                                              │
│   Dashboard · Kanban · Platforms · Genome · Tasks · Skills   │
│   Settings                                                   │
│                ▲ WebSocket events                            │
│                │ REST API                                    │
└────────────────┼─────────────────────────────────────────────┘
                 │
┌────────────────┼─────────────────────────────────────────────┐
│  Server (Express + WS)                                       │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│  │ Stores     │  │ Workers    │  │ ProviderRegistry       │  │
│  │ ─ Task     │◄─┤ ─ Dispatch │  │ ─ 7 adapters           │  │
│  │ ─ Provider │  │ ─ Pattern  │  │   (Ollama, Claude,     │  │
│  │ ─ Skill    │  │ ─ Skill    │  │    Gemini, Hermes,     │  │
│  │ ─ Pattern  │  │ ─ Health   │  │    OpenCode, ACP×2)    │  │
│  │ ─ Observe  │  │            │  │ ─ /connect endpoint    │  │
│  └────────────┘  └────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                 │
                 ▼
         PTY processes for CLI agents
```

### Key subsystems

- **`ProviderRegistry`** — knows all 7 built-in providers; runs a `HealthCheckWorker` every 30s. POST `/api/providers/connect` onboards a new provider.
- **`DispatcherWorker`** — polls `TaskStore` every 2s, claims `todo` tasks, routes to the best live provider, spawns via `ProcessManager`. Records `TaskObservation`s on completion.
- **`PatternDetectorWorker`** — every 60s, cosine-clusters recent observations into patterns. Emits `pattern:detected` WS events; calls `SkillRunner.handleCrystallisationRequest`.
- **`SkillRunnerWorker`** — owns skill genesis (auto or CEO-approved) and skill matching (`matchForTask` is called by dispatcher before each dispatch).
- **`v3-stores.ts`** — Zustand-style reactive stores for tasks, providers, skills, patterns, observations. Each store emits typed WS events via `EventBus`.

---

## 🎨 Aesthetic — "Observatory"

| Token | Value | Use |
|-------|-------|-----|
| Base | `#07091a` | Deep space black |
| Surface | `#0d1124` + `backdrop-blur(20px)` | Glass panels |
| Accent cyan | `#06b6d4` | Live, in-progress, connected |
| Accent violet | `#8b5cf6` | Crystallised, success |
| Agent amber | `#f59e0b` | Claude |
| Agent blue | `#3b82f6` | Gemini |
| Agent green | `#10b981` | Ollama |
| Agent orange | `#f97316` | Hermes |
| Agent violet | `#8b5cf6` | OpenCode |

Typography: **Space Grotesk** (display) · **Instrument Serif** (editorial accent) · **JetBrains Mono** (code).
Icons: **Lucide** only — no emoji.

---

## 🛠 REST API Reference

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness check |
| `GET /api/tasks` | List tasks (filter by `status`, `priority`) |
| `POST /api/tasks` | Create task |
| `PATCH /api/tasks/:id` | Update task (e.g. status) |
| `GET /api/skills` | List skills (filter by `providerId`, `status`) |
| `POST /api/skills/:id/archive` | Archive a skill |
| `GET /api/patterns` | List detected patterns |
| `GET /api/patterns/pending` | Patterns awaiting CEO approval |
| `POST /api/patterns/:id/approve` | CEO approves → crystallise |
| `POST /api/patterns/:id/reject` | CEO rejects |
| `POST /api/patterns/detect` | Manually trigger detection |
| `GET /api/providers/meta` | All 7 providers with capabilities |
| `POST /api/providers/connect` | Onboard a provider (health-check + register) |
| `DELETE /api/providers/:id/connect` | Disconnect |
| `GET /api/stats` | Aggregated KPIs for the Dashboard |

---

## 📁 Project Structure

```
constellation/
├── shared/                 # @constellation/shared — types, events
│   └── src/index.ts        # All shared types (Task, Skill, Pattern, etc.)
├── server/                 # @constellation/server — Express + WS + workers
│   └── src/
│       ├── index.ts        # Wires stores + workers + routes
│       ├── adapters/       # 7 provider adapters (CLI/HTTP/ACP)
│       ├── store/          # Reactive stores (Tasks, Skills, Patterns, ...)
│       ├── workers/        # Dispatcher, PatternDetector, SkillRunner, HealthCheck
│       └── provider-registry.ts
├── client/                 # @constellation/client — React 19 + Vite + R3F
│   └── src/
│       ├── pages/          # 7 page components
│       ├── components/     # layout, dashboard, kanban, platforms, tasks, skills, settings
│       ├── store/          # Zustand client stores (mirror server stores)
│       └── router.tsx      # Routes /, /kanban, /platforms, /genome, /tasks, /skills, /settings
└── docs/
    ├── SPEC.md             # Product spec (iter 3)
    ├── PLAN.md             # 13-phase implementation plan
    └── ...
```

---

## 🧭 Decisions locked (iter 3)

1. **Dashboard 3D brain**: Hybrid — agents + skills now (Phase 3-7), knowledge-graph + second-brain nodes later (Phase B).
2. **Kanban DnD**: `@dnd-kit/core`.
3. **Provider onboarding**: single `/connect` command + auto-detect.
4. **Task review gate**: real CEO approval required (no auto-approve).
5. **Skill crystallisation**: hybrid — auto if success ≥ 90%, else ask CEO.
6. **Skill execution**: replay-as-template, LLM-fallback if env swayed.
7. **Skill visualisation**: Evolution-mode-only on Genome page.
8. **Orchestrator**: v1 = single generic dispatcher; named-role hierarchy (CTO/CMO/Security Director) deferred.
9. **Navigation**: hybrid — Dashboard bespoke, others standard shell.

---

## 🚧 Out of scope (v1)

- Named-role orchestrator (CTO/CMO/Security Director) — Phase 2
- LLM-based task routing (v1 uses keyword heuristics)
- Cross-agent skill sharing
- User-authored Skills UI
- Skill marketplace / cross-instance sharing
- LLM calls in pattern detection (embedding clustering only)
- Mobile responsive
- Cloud sync

---

## 📝 License

Private — internal Agent OS project.

---

*Built iter-by-iter with the philosophy: "we will keep evolving this." Each iteration
updates SPEC.md first, then code, then verification, then SPEC.md again.*