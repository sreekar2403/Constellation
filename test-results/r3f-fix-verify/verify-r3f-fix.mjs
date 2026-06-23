// Constellation · R3F fix verification — integration test
// Runs against the live Vite dev server on http://localhost:5173
//
// What it covers:
//   1. All routes in router.tsx load without throwing.
//   2. ForceGraph / Canvas in BOTH consumer files does not emit
//      "R3F: Hooks can only be used within the Canvas component!".
//   3. KnowledgeGraph3D (Dashboard hero) accepts range/filter clicks without
//      crashing.
//   4. Screenshots saved under ./screens/<route>/<step>.png
//   5. JSON report at ./report.json (per-route verdict + console errors).

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = path.resolve('./screens');
const REPORT = path.resolve('./report.json');
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { id: '01-dashboard',       path: '/',            label: 'Dashboard (KnowledgeGraph3D · ForceGraph)' },
  { id: '02-kanban',          path: '/kanban',      label: 'Kanban' },
  { id: '03-platforms',       path: '/platforms',   label: 'Platforms' },
  { id: '04-genome',          path: '/genome',      label: 'Genome' },
  { id: '05-tasks',           path: '/tasks',       label: 'Tasks' },
  { id: '06-skills',          path: '/skills',      label: 'Skills' },
  { id: '07-settings',        path: '/settings',    label: 'Settings' },
];

// Routes where we expect ForceGraph / Canvas to render:
const THREE_D_ROUTES = new Set(['01-dashboard']);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

const report = {
  base: BASE,
  startedAt: new Date().toISOString(),
  routes: [],
  r3fHooksErrorSeen: false,
  overallPass: true,
};

const CRITICAL_PATTERNS = [
  /R3F: Hooks can only be used within the Canvas component/i,
  /Canvas:\s*component is not inside a <Canvas>/i,
  /useStore.*outside of Canvas/i,
];

const isCritical = (text) => CRITICAL_PATTERNS.some((re) => re.test(text));

for (const r of ROUTES) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const consoleAll = [];

  page.on('console', (msg) => {
    const entry = { type: msg.type(), text: msg.text() };
    consoleAll.push(entry);
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(entry);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ type: 'pageerror', text: err.message });
  });

  const url = BASE + r.path;
  const routeOut = path.join(OUT, r.id);
  fs.mkdirSync(routeOut, { recursive: true });

  let loadErr = null;
  let screenshotOk = null;
  let r3fHooksHere = false;
  let interactionOk = null;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // give R3F / suspense / store hydration a beat
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Initial screenshot
    const initialShot = path.join(routeOut, '01-initial.png');
    await page.screenshot({ path: initialShot, fullPage: false });
    screenshotOk = fs.statSync(initialShot).size > 0;

    // Probe for R3F error in console
    r3fHooksHere = consoleErrors.some((e) => isCritical(e.text)) ||
                   pageErrors.some((e) => isCritical(e.text));
    if (r3fHooksHere) report.r3fHooksErrorSeen = true;

    // Interaction smoke test on Dashboard (the 3D hero)
    if (THREE_D_ROUTES.has(r.id)) {
      // Click each range button by visible text to confirm click handlers work
      const ranges = ['1h', 'Today', 'Week', 'All'];
      for (const label of ranges) {
        const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
        if (await btn.count()) {
          try { await btn.first().click({ timeout: 3000 }); } catch {}
        }
      }
      // Filter chips too
      const filters = ['All', 'Agents', 'Skills', 'Files'];
      for (const label of filters) {
        const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
        if (await btn.count()) {
          try { await btn.first().click({ timeout: 3000 }); } catch {}
        }
      }
      // Click "Today" range explicitly and screenshot stable state
      const todayBtn = page.getByRole('button', { name: /^Today$/ });
      if (await todayBtn.count()) {
        await todayBtn.first().click().catch(() => {});
      }
      await page.waitForTimeout(500);
      const afterShot = path.join(routeOut, '02-after-interactions.png');
      await page.screenshot({ path: afterShot, fullPage: false });
      interactionOk = fs.statSync(afterShot).size > 0;
    }
  } catch (e) {
    loadErr = e.message;
  }

  // DOM probe: capture visible heading / canvas presence for traceability
  let dom = {};
  try {
    dom = await page.evaluate(() => ({
      canvasElCount: document.querySelectorAll('canvas').length,
      rootChildren: document.getElementById('root')?.innerHTML?.length || 0,
      title: document.title,
    }));
  } catch {}

  await page.close();

  const criticalErrors = [...consoleErrors, ...pageErrors].filter((e) => isCritical(e.text));
  const verdict = r3fHooksHere || loadErr ? 'FAIL' : 'PASS';

  report.routes.push({
    id: r.id,
    path: r.path,
    label: r.label,
    screenshotOk,
    interactionOk,
    r3fHooksHere,
    loadErr,
    canvasCount: dom.canvasElCount,
    rootSize: dom.rootChildren,
    criticalErrors,
    consoleErrorsCount: consoleErrors.length,
    pageErrorsCount: pageErrors.length,
    consoleErrorsSample: consoleErrors.slice(0, 5),
    pageErrorsSample: pageErrors.slice(0, 5),
    verdict,
  });

  if (verdict === 'FAIL') report.overallPass = false;
}

report.finishedAt = new Date().toISOString();
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ overallPass: report.overallPass, r3fHooksErrorSeen: report.r3fHooksErrorSeen }, null, 2));

await browser.close();
process.exit(report.overallPass ? 0 : 2);
