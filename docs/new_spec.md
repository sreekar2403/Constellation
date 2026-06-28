Phase 0 — Stop the bleeding (a few hours)
Quick, low-risk fixes that remove obviously wrong signals:

Add an actual ESLint config (eslint.config.js for ESLint 9 flat config, matching the TS/React setup) so npm run lint stops failing immediately.
Reconcile the LICENSE contradiction: either change the README's License section to say "MIT" (matching the actual LICENSE file GitHub already displays), or swap in a private license file. Pick one — right now they disagree.
Fix the README's adapter list ("ACP×2" → "Pi CLI, Kimi CLI") so it matches adapters/index.ts.
Either restore docs/ (maybe as a separate private repo or submodule) or remove the references to docs/SPEC.md/docs/PLAN.md from the README's project-structure section, since they currently point at files that don't exist for anyone who clones the repo.

Phase 1 — Remove dead weight (half a day)
Before adding anything new, cut the ~3,200 lines that aren't wired to anything:

Delete Cockpit.tsx, RootPicker.tsx, SessionDashboard.tsx, SettingsPanel.tsx, InterventionPanel.tsx, the whole panels/ directory (PanelContainer, CodePanel, FileBrowserPanel, MemoryPanel, TerminalPanel, AgentStatus), topology/, and knowledge-graph/. Before deleting, grep one more time for each filename across the repo to be sure nothing references it (some of these reference each other in their own dead cluster, so delete as a group).
Remove the now-unused deps from client/package.json: @monaco-editor/react, @xterm/xterm, react-xtermjs, react-force-graph-2d. Run npm install after to clean the lockfile.
If any of that legacy functionality (live terminal view, file-change panel, chat panel) is actually still wanted, re-scope it as a real ticket against the current page structure rather than resurrecting the orphaned version — it was built against an older app shape.

Phase 2 — Persistence (the big one, ~2-3 days)
This is the architectural gap that undercuts the core pitch. Every store (TaskStore, ProviderStore, SkillStore, PatternStore, ObservationStore) is an in-memory Map, so a server restart erases the entire skill genome — the thing the product is supposed to accumulate over time.

Add a lightweight embedded DB (better-sqlite3 is the natural fit here — zero external service, synchronous API, fine for single-user local use).
Start with Skill and Pattern first, since those are the actual "memory" the self-evolution loop produces — losing tasks/observations on restart is much less costly than losing the genome.
Snapshot-on-write is simplest: each store's mutation methods (create, update, etc. in v3-stores.ts) write through to SQLite, and the constructor hydrates from disk at startup.
Add a GET /api/skills/export / import pair while you're in there — useful for backups and for the "no cloud sync, v1" decision the README already states.

Phase 3 — Security hardening, scoped to "local tool" reality (~1 day)
You don't need enterprise auth for a localhost dev tool, but these are cheap to fix and remove real foot-guns:

Replace app.use(cors()) with an explicit allow-list (just http://localhost:5173, or read from config) — wide-open CORS plus no auth means any tab open in the same browser could hit the API.
In process-manager.ts, stop passing the full process.env into spawned agent shells. Pass an explicit allow-list (PATH, HOME, and whatever the specific CLI tool needs) so secrets sitting in the server's environment aren't handed to an autonomous agent process by default.
Add a one-line note to the README ("intended for local/single-user use; do not expose the server port publicly without adding auth") so the current scope is explicit rather than implicit.
If you ever do want multi-user or remote access, that's a separate, bigger task (session-based auth + per-user workspace scoping) — not worth doing speculatively now.

Phase 4 — Fix the smaller correctness issues (~half a day)

ProcessManager.buildCommand() only special-cases claude-code/gemini-cli/opencode/ollama; hermes/pi/kimi fall through to a bare config.tool with no flag support. Either give them real command-building branches or document why the generic fallback is intentional.
Swap the 37 raw console.log/console.error calls in server/src over to the pino logger that's already set up, so log level and formatting are consistent.

Phase 5 — Get a real test suite in place (~2-3 days, ongoing)
There are zero test files right now. Given the project's core logic (pattern clustering, dispatcher routing, skill matching) is exactly the kind of thing that's easy to silently break:

Add vitest (pairs well with the existing Vite setup) to both server and client workspaces.
Prioritize tests for pattern-detector.ts (clustering + threshold logic) and dispatcher.ts (routing + observation recording) first — these are the highest-value, least-visually-obvious-when-broken pieces.
Add a GitHub Actions workflow that runs npm run typecheck, npm run lint, and tests on push — cheap insurance once tests exist.

Phase 6 — Commit hygiene going forward
Not a code fix, but worth adopting now while the repo is young: commit incrementally per feature/fix instead of squashing everything into one giant snapshot. It costs nothing and means future-you (or anyone else) can actually see how a feature evolved instead of staring at one 24k-line commit.

Phase 7 — Fix the design system itself (~half a day)
Before touching any visual polish, there's a real bug in how theming is wired:

client/tailwind.config.ts maps colors.bg.primary → var(--bg-primary), text.primary → var(--text-primary), etc. But theme.css only ever defines --color-bg-primary, --color-text-primary (with the --color- prefix), and Tailwind v4's CSS-first @theme block already auto-generates the real utilities your components actually use — bg-bg-elevated, text-text-primary, bg-accent-primary (confirmed in Button.tsx). There's no @config directive anywhere pointing Tailwind at the JS config, so in Tailwind v4 that file is silently inert — it does nothing, ever. Delete tailwind.config.ts entirely rather than leaving it as a trap for the next person who edits a color there expecting an effect.
Skeleton.tsx exists as a component but isn't used on a single page — every list (TaskTable, SkillGrid) renders nothing or a flash of empty state during fetch instead of a skeleton. Either wire it in or delete it; right now it's built and abandoned, same pattern as the dead components from Phase 1.

Phase 8 — Lean into the actual "Observatory" identity (~2-3 days)
This is where I'd apply the frontend-design skill directly. The product is named Constellation, the README brands itself "a deep-space command surface," and the color tokens are literally called things like --color-bg-primary: #07091a ("deep space black") — but nothing in the actual rendered UI commits to that world. There's no starfield, no literal constellation motif, no parallax depth — it's dark-navy panels with cyan/violet glow accents, which reads as generic "AI ops dashboard" rather than something that could only be Constellation. A few concrete, scoped moves:

Pick one signature element and commit to it. The Genome page is the natural candidate — it's already a literal node-and-edge graph (skills as stars, lineage as constellation lines) rendered in 3D with d3-force-3d + R3F. Push that motif outward: a subtle, static starfield background (not animated noise — actual dim points, sparse, behind the glass panels) on the Dashboard and Genome pages only, so it reads as the one bold move rather than decoration everywhere.
Stop using glow as a generic state indicator. Right now cyan/violet glow shadows (shadow-glow-cyan, shadow-glow-violet) seem to mark "live" and "crystallised" the same way any dashboard marks status with a colored ring. Tie the visual language to the subject instead: a newly crystallised Skill could visibly "ignite" — the existing skill-birth keyframe animation is already there, just check it's actually triggered at the moment of crystallization in the Genome view, not just defined and unused.
Fix the empty states — they're the weakest copy in the app. SkillGrid.tsx and TaskTable.tsx both just render "No skills found." / "No tasks found." That's a missed opportunity specifically because this product's whole pitch is that Skills appear on their own over time. An empty Skills page should say something like "No skills yet — they crystallise automatically once a task pattern repeats 5+ times with a 90%+ success rate" (pulling the real threshold from pattern-detector.ts, not invented copy) — turning an empty state into the one place that actually explains the core mechanic to a new user.
Audit the type pairing for restraint, not replacement — Space Grotesk / Instrument Serif / JetBrains Mono is already a deliberate, non-default pairing (skip rewriting this), but check it's actually used with the discipline the skill calls for: serif reserved for a handful of editorial moments (a hero stat, a section like "Genome"), not bleeding into UI labels where mono or sans should carry data.
Mobile is explicitly "out of scope v1" per the README — leave that decision alone, but if you revisit it later, the TopHUD/TacticalRail's fixed 40px bars are the first thing that'll need a real breakpoint strategy rather than a squeeze.

Phase 9 — Enhance the core idea (ongoing, pick 2-3 to start)
These build on what's already there rather than bolting on unrelated features:

Make "tokens saved" a visible ROI story, not just a recorded field. The README mentions skills record tokens saved when they fire, but nothing surfaces it prominently. Add a running counter to the KPI strip — tokens saved, estimated cost saved, hours of re-prompting avoided — so the abstract "self-evolving" pitch becomes a number that grows, which is also the most convincing thing you could show someone skeptical of the concept.
Skill confidence decay. Right now a crystallised skill just sits there and keeps firing. Add a rolling success-rate check: if a skill's last N firings drop below the original crystallization threshold (90%), automatically demote it back to "pending review" instead of silently degrading — closing the loop the pattern-detector already opened, using the same success-rate logic that already exists.
Dry-run before auto-fire. When the dispatcher matches a task to a skill, let the CEO optionally preview the templated steps it's about to inject before they're used, rather than only finding out after the fact via the task trace. Low lift — matchForTask already produces the match, this just adds a confirm step in the Kanban "Needs Clarification" flow that already exists.
Scope skills to a workspace, not one global genome. Currently skills aren't tied to the project they were learned in. A pattern crystallised while working on a Python API probably shouldn't auto-fire on a React frontend task. Tagging skills with the workspace path they were observed in (you already track rootPath per workspace) and filtering matches by it would make crystallization meaningfully safer as you use this across more than one project.
Single-skill export/import. The README lists full marketplace/cross-instance sharing as explicitly out of scope — reasonable. A much smaller version: a "export this skill as JSON" button on one skill card, so you can manually hand a well-performing skill to another machine or teammate without building any sync infrastructure.