import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { getConfig } from './config.js';
import { EventBus } from './event-bus.js';
import { SessionManager } from './session-manager.js';
import { ProcessManager } from './process-manager.js';
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
import { getDB } from './db.js';

async function main() {
  const config = getConfig();
  const db = await getDB();

  const logger = pino({
    transport: { target: 'pino-pretty', options: { colorize: true } },
    level: config.logLevel,
  });

  const app = express();
  app.use(cors({ origin: ['http://localhost:5173'] }));
  app.use(express.json());

  // Core services
  const eventBus = new EventBus();
  const sessionManager = new SessionManager();
  const processManager = new ProcessManager();

  // v3.0 Agent OS stores
  const taskStore = new TaskStore(eventBus);
  const providerStore = new ProviderStore(eventBus);
  const skillStore = new SkillStore(eventBus, db);
  const patternStore = new PatternStore(eventBus, db);
  const observationStore = new ObservationStore(eventBus);

  // Provider Registry — knows all 7 providers, health‑checks, emits events
  const registry = new ProviderRegistry(eventBus);

  // Health‑check worker — pings all providers every 30s, emits health_changed events
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

  // HTTP routes (retain existing ones)
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
      const task = taskStore.create(req.body);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const updated = taskStore.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const ok = taskStore.delete(req.params.id);
    res.json({ deleted: ok });
  });

  // --- Providers (Registry) ---
  app.get('/api/providers', (_req, res) => {
    const providers = registry.listProviderMeta().map((meta) => ({
      id: meta.id,
      displayName: meta.displayName,
      icon: meta.icon,
      brandColor: meta.brandColor,
      type: meta.type,
      endpoint: meta.defaultEndpoint,
      enabled: true,
      registeredAt: new Date().toISOString(),
      capabilities: meta.capabilities,
      healthStatus: meta.isLive ? 'live' : (meta.error ? 'offline' : 'idle'),
      lastHealthCheckAt: meta.isLive ? new Date().toISOString() : undefined,
    }));
    res.json(providers);
  });

  app.get('/api/providers/meta', (_req, res) => {
    const providers = registry.listProviderMeta();
    res.json(providers);
  });

  // --- Skills (Self-Evolution) ---
  app.get('/api/skills', (req, res) => {
    const status = req.query.status as 'active' | 'archived' | undefined;
    const providerId = req.query.providerId as string | undefined;
    const skills = skillStore.list({ status, providerId });
    res.json(skills);
  });

  // --- Patterns (Self-Evolution) ---
  app.get('/api/patterns/pending', (_req, res) => {
    const patterns = patternStore.list({ status: 'pending-crystallisation' });
    res.json(patterns);
  });

  // --- Stats (Dashboard KPI) ---
  app.get('/api/stats', (_req, res) => {
    const stats = computeSystemStats(
      taskStore,
      providerStore,
      skillStore,
      () => 0, // activeAgentsFn - no active agents tracking yet
    );
    res.json(stats);
  });

  // --- Workspace (Settings) ---
  let currentWorkspace = process.cwd();
  app.get('/api/workspace', (_req, res) => {
    res.json({ path: currentWorkspace });
  });

  app.post('/api/workspace', (req, res) => {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'path is required' });
      return;
    }
    currentWorkspace = path;
    res.json({ path: currentWorkspace });
  });

  // --- Skill export / import endpoints (new) ---
  app.get('/api/skills/export', async (_req, res) => {
    try {
      const rows = await db.all('SELECT * FROM skills');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/skills/import', async (req, res) => {
    const skills: any[] = req.body;
    if (!Array.isArray(skills)) {
      res.status(400).json({ error: 'Expected an array of skill objects' });
      return;
    }
    try {
      await db.run('BEGIN');
      for (const skill of skills) {
        const stmt = `INSERT OR REPLACE INTO skills (id, name, description, providerId, triggerEmbedding, similarityThreshold, usageCount, totalTokensSaved, status, createdAt, steps, sourcePatternId, generation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.run(stmt, [
          skill.id,
          skill.name,
          skill.description,
          skill.providerId,
          JSON.stringify(skill.triggerEmbedding),
          skill.similarityThreshold,
          skill.usageCount,
          skill.totalTokensSaved,
          skill.status,
          skill.createdAt,
          JSON.stringify(skill.steps),
          skill.sourcePatternId,
          skill.generation,
        ]);
      }
      await db.run('COMMIT');
      res.json({ status: 'imported', count: skills.length });
    } catch (err) {
      await db.run('ROLLBACK');
      res.status(500).json({ error: String(err) });
    }
  });

  // Start HTTP server
  const port = config.port ?? 3000;
  app.listen(port, () => {
    logger.info(`Constellation server listening on port ${port}`);
  });
}

main().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
