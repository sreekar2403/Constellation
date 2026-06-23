import express from 'express';
import cors from 'cors';
import pino from 'pino';
import fs from 'node:fs';
import { getConfig } from './config.js';
import { EventBus } from './event-bus.js';
import { SessionManager } from './session-manager.js';
import { ProcessManager } from './process-manager.js';
import { WSServer } from './websocket-server.js';
import { listDirectory, buildTree } from './file-service.js';
import { indexer } from './indexer/index.js';
import { ProviderRegistry } from './provider-registry.js';
import type { ProviderId } from './provider-registry.js';
import { HealthCheckWorker } from './workers/health-check.js';
import { DispatcherWorker } from './workers/dispatcher.js';
import { PatternDetectorWorker } from './workers/pattern-detector.js';
import { SkillRunnerWorker } from './workers/skill-runner.js';
import {
  TaskStore,
  ProviderStore,
  SkillStore,
  PatternStore,
  ObservationStore,
  computeSystemStats,
} from './store/v3-stores.js';
import type { TaskStatus, TaskPriority, ProviderHealth } from '@constellation/shared';

const config = getConfig();

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } },
  level: config.logLevel,
});

const app = express();
app.use(cors());
app.use(express.json());

// Core services
const eventBus = new EventBus();
const sessionManager = new SessionManager();
const processManager = new ProcessManager();

// v3.0 Agent OS stores
const taskStore = new TaskStore(eventBus);
const providerStore = new ProviderStore(eventBus);
const skillStore = new SkillStore(eventBus);
const patternStore = new PatternStore(eventBus);
const observationStore = new ObservationStore(eventBus);

// Provider Registry — knows all 7 providers, health-checks, emits events
const registry = new ProviderRegistry(eventBus);

// Health-check worker — pings all providers every 30s, emits health_changed events
const healthWorker = new HealthCheckWorker(registry, 30_000);
healthWorker.start();

// Skill runner — owns the Skill lifecycle (genesis + execution match)
const skillRunner = new SkillRunnerWorker(
  skillStore,
  patternStore,
  observationStore,
  eventBus,
);

// Dispatcher worker — polls for tasks and routes to providers
const dispatcher = new DispatcherWorker(taskStore, registry, processManager, eventBus, observationStore, skillRunner);
dispatcher.start();

// Pattern detector — monitors completed observations and crystallises recurring patterns into Skills
const patternDetector = new PatternDetectorWorker(
  observationStore,
  patternStore,
  eventBus,
);
patternDetector.start();

// Skill runner starts after wiring
skillRunner.start();

// Wire the crystallisation request from pattern detector to skill runner
patternDetector.onCrystallisationRequest((req) => {
  skillRunner.handleCrystallisationRequest(req.pattern, req.auto);
});

// HTTP routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sessions', (_req, res) => {
  res.json(sessionManager.listSessions());
});

app.post('/api/sessions', (req, res) => {
  try {
    const session = sessionManager.createSession(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// File listing endpoints (for knowledge graph loading screen)
app.get('/api/files/list', async (req, res) => {
  try {
    const dirPath = (req.query.path as string) || process.cwd();
    const entries = await listDirectory(dirPath);
    res.json({ path: dirPath, entries });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get('/api/files/tree', async (req, res) => {
  try {
    const rootPath = (req.query.root as string) || process.cwd();
    const depth = parseInt(req.query.depth as string) || 2;
    const tree = await buildTree(rootPath, depth);
    res.json({ root: rootPath, tree });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get('/api/files/content', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'path is required' });
      return;
    }

    const fs = await import('node:fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const stat = await fs.stat(filePath);

    res.json({
      path: filePath,
      content,
      size: stat.size,
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Knowledge graph indexing endpoints
app.post('/api/index/start', async (req, res) => {
  try {
    const { rootPath } = req.body;
    if (!rootPath) {
      res.status(400).json({ error: 'rootPath is required' });
      return;
    }

    // Start indexing in background
    indexer.startIndexing(rootPath);

    res.json({ status: 'started', rootPath });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/index/stop', (_req, res) => {
  indexer.stopIndexing();
  res.json({ status: 'stopped' });
});

app.get('/api/index/status', (_req, res) => {
  const state = indexer.getState();
  res.json(state);
});

app.get('/api/graph', (_req, res) => {
  const graph = indexer.getGraph();
  if (!graph) {
    res.status(404).json({ error: 'No graph available. Start indexing first.' });
    return;
  }
  res.json(graph);
});

// ============================================================
// v3.0 — Agent OS REST endpoints
// ============================================================

/* --- Tasks (CEO Kanban) --- */

app.get('/api/tasks', (req, res) => {
  const status = req.query.status as TaskStatus | undefined;
  const priority = req.query.priority as TaskPriority | undefined;
  res.json(taskStore.list({ status, priority }));
});

app.get('/api/tasks/:id', (req, res) => {
  const task = taskStore.get(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, priority, platform, model, workspace } = req.body ?? {};
    if (!title || !description || !workspace) {
      res.status(400).json({ error: 'title, description, workspace are required' });
      return;
    }
    const task = taskStore.create({
      title,
      description,
      priority,
      platform,
      model,
      workspace,
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  const updated = taskStore.update(req.params.id, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const ok = taskStore.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.status(204).end();
});

/* --- Providers --- */

app.get('/api/providers', (_req, res) => {
  res.json(providerStore.list());
});

/** GET /api/providers/meta — all 7 providers with capabilities (no auth needed) */
app.get('/api/providers/meta', (_req, res) => {
  res.json(registry.listProviderMeta());
});

/** GET /api/providers/:id/status — live/disconnected/error for one provider */
app.get('/api/providers/:id/status', (req, res) => {
  const status = registry.getStatus(req.params.id);
  res.json({ id: req.params.id, status, error: null });
});

// NEW: Get available models for a provider
app.get('/api/providers/:id/models', async (req, res) => {
  const { id } = req.params;
  try {
    const models = await registry.getModels(id as ProviderId);
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/providers/:id', (req, res) => {
  const p = providerStore.get(req.params.id);
  if (!p) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  res.json(p);
});

app.post('/api/providers', (req, res) => {
  try {
    const provider = providerStore.register(req.body ?? {});
    res.status(201).json(provider);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.patch('/api/providers/:id/health', (req, res) => {
  const { status } = req.body ?? {};
  if (!status || !['live', 'idle', 'offline'].includes(status)) {
    res.status(400).json({ error: 'status must be live | idle | offline' });
    return;
  }
  const updated = providerStore.updateHealth(req.params.id, status as ProviderHealth);
  if (!updated) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  res.json(updated);
});

app.delete('/api/providers/:id', (req, res) => {
  const ok = providerStore.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  res.status(204).end();
});

/** POST /api/providers/connect — health-check + register a provider */
app.post('/api/providers/connect', async (req, res) => {
  const { id } = req.body ?? {};
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'body.id is required (e.g. "ollama", "claude-code")' });
    return;
  }

  try {
    const config = await registry.connect(id as Parameters<typeof registry.connect>[0]);
    if (!providerStore.get(id)) {
      providerStore.register({
        id: config.id,
        displayName: config.displayName,
        icon: config.icon,
        brandColor: config.brandColor,
        type: config.type,
        binary: config.binary,
        args: config.args,
        endpoint: config.endpoint,
        env: config.env,
        enabled: true,
        capabilities: config.capabilities,
      });
    }
    res.json(config);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

/** DELETE /api/providers/:id/connect — disconnect a live provider */
app.delete('/api/providers/:id/connect', (req, res) => {
  const id = req.params.id as Parameters<typeof registry.disconnect>[0];
  registry.disconnect(id);
  // Update ProviderStore enabled flag so it persists as disabled
  const p = providerStore.get(id);
  if (p) {
    // Re-register with enabled=false (keeps provider in store)
    providerStore.register({ ...p, enabled: false });
  }
  res.json({ id, status: 'disconnected' });
});

/* --- Skills --- */

app.get('/api/skills', (req, res) => {
  const providerId = req.query.providerId as string | undefined;
  const status = req.query.status as 'active' | 'archived' | undefined;
  res.json(skillStore.list({ providerId, status }));
});

app.get('/api/skills/:id', (req, res) => {
  const s = skillStore.get(req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }
  res.json(s);
});

app.get('/api/skills/:id/triggers', (req, res) => {
  const s = skillStore.get(req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }
  const triggers = skillStore.listTriggers(500).filter((t) => t.skillId === req.params.id);
  res.json(triggers);
});

app.post('/api/skills/:id/archive', (req, res) => {
  const updated = skillStore.archive(req.params.id);
  if (!updated) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }
  res.json(updated);
});

/* --- Patterns --- */

app.get('/api/patterns', (req, res) => {
  const status = req.query.status as
    | 'observing'
    | 'pending-crystallisation'
    | 'crystallised'
    | 'rejected'
    | undefined;
  res.json(patternStore.list({ status }));
});

/** GET /api/patterns/pending — patterns awaiting CEO review */
app.get('/api/patterns/pending', (_req, res) => {
  res.json(skillRunner.listPendingReview());
});

/** POST /api/parameters/:id/approve — CEO approves a pending pattern → crystallise */
app.post('/api/patterns/:id/approve', (req, res) => {
  const skill = skillRunner.approvePending(req.params.id);
  if (!skill) {
    res.status(404).json({ error: 'Pattern not found in pending review' });
    return;
  }
  res.json(skill);
});

/** POST /api/patterns/:id/reject — CEO rejects a pending pattern */
app.post('/api/patterns/:id/reject', (req, res) => {
  skillRunner.rejectPending(req.params.id);
  res.json({ id: req.params.id, status: 'rejected' });
});

/** POST /api/patterns/detect — manually trigger pattern detector (for testing) */
app.post('/api/patterns/detect', async (_req, res) => {
  try {
    const patterns = await patternDetector.runOnce();
    res.json({ detected: patterns.length, patterns });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* --- Aggregated stats (Dashboard KPI strip) --- */

app.get('/api/stats', (_req, res) => {
  res.json(
    computeSystemStats(taskStore, providerStore, skillStore, () =>
      processManager.listAgents().length,
    ),
  );
});

/* --- Observations (debug-only in v1) --- */

app.get('/api/observations', (req, res) => {
  const providerId = req.query.providerId as string | undefined;
  const sinceMs = req.query.sinceMs ? Number(req.query.sinceMs) : undefined;
  res.json(observationStore.list({ providerId, sinceMs }));
});

/** POST /api/observations — manual seed endpoint (useful for testing pattern detector) */
app.post('/api/observations', (req, res) => {
  const obs = observationStore.append(req.body ?? {});
  res.status(201).json(obs);
});

/* --- Workspace (Settings tab) --- */

const WORKSPACE_FILE = '.constellation-workspace';

function readWorkspacePath(): string {
  try {
    if (fs.existsSync(WORKSPACE_FILE)) {
      return fs.readFileSync(WORKSPACE_FILE, 'utf-8').trim();
    }
  } catch { /* ignore */ }
  return process.cwd();
}

function writeWorkspacePath(p: string): void {
  fs.writeFileSync(WORKSPACE_FILE, p, 'utf-8');
}

app.get('/api/workspace', (_req, res) => {
  res.json({ path: readWorkspacePath() });
});

app.post('/api/workspace', (req, res) => {
  const { path } = req.body ?? {};
  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'body.path is required (string)' });
    return;
  }
  try {
    writeWorkspacePath(path);
    res.json({ path });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// WebSocket server
const wsServer = new WSServer(
  config.wsPort,
  eventBus,
  sessionManager,
  processManager
);

// Start HTTP server
app.listen(config.port, () => {
  logger.info(`Constellation server started`);
  logger.info(`  HTTP:  http://localhost:${config.port}`);
  logger.info(`  WS:    ws://localhost:${config.wsPort}`);
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  healthWorker.stop();
  dispatcher.stop();
  patternDetector.stop();
  skillRunner.stop();
  await processManager.killAll();
  wsServer.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, eventBus, sessionManager, processManager, wsServer };