import { chromium } from 'playwright';
import fs from 'fs';

async function runIntegrationTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Capture network errors
  const networkErrors = [];
  page.on('response', response => {
    if (!response.ok() && response.url().includes('/api/')) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  console.log('🔍 Starting integration test...');
  console.log('=' .repeat(60));
  
  // Test 1: Dashboard (root)
  console.log('\n📋 TEST 1: Dashboard (/)');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for hydration
    
    // Check KPI Strip - look for the KPI cards
    const totalTasks = await page.locator('text=Total Tasks').count();
    const activeNow = await page.locator('text=Active Now').count();
    const completed = await page.locator('text=Completed').count();
    const tokensUsed = await page.locator('text=Tokens Used').count();
    const kpiStrip = totalTasks + activeNow + completed + tokensUsed;
    console.log(`  KPI Strip: TotalTasks=${totalTasks} ActiveNow=${activeNow} Completed=${completed} TokensUsed=${tokensUsed} (sum=${kpiStrip})`);
    
    // Check AI Platforms Panel - look for "AI Platforms" header
    const platformsPanel = await page.locator('text=AI Platforms').count();
    console.log(`  AI Platforms Panel header: ${platformsPanel}`);
    
    // Check 3D Graph
    const graphCanvas = await page.locator('canvas').count();
    console.log(`  3D Graph canvas elements: ${graphCanvas}`);
    
    // Scroll test
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  Page scroll height: ${scrollHeight}px`);
    
    // Screenshot
    await page.screenshot({ path: '/tmp/dashboard.png', fullPage: true });
    console.log('  ✓ Screenshot saved');
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  
  // Test 2: Platforms page
  console.log('\n📋 TEST 2: Platforms (/platforms)');
  try {
    await page.goto('http://localhost:5173/platforms', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const providerCards = await page.locator('[class*="bg-glass"], [class*="rounded-xl"], [class*="interactive-surface"]').count();
    console.log(`  Provider cards: ${providerCards}`);
    
    const connectButtons = await page.locator('button:has-text("Connect")').count();
    console.log(`  Connect buttons: ${connectButtons}`);
    
    const refreshButton = await page.locator('button:has-text("Refresh")').count();
    console.log(`  Refresh button: ${refreshButton}`);
    
    await page.screenshot({ path: '/tmp/platforms.png', fullPage: true });
    console.log('  ✓ Screenshot saved');
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  
  // Test 3: Skills page
  console.log('\n📋 TEST 3: Skills (/skills)');
  try {
    await page.goto('http://localhost:5173/skills', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const skillCards = await page.locator('[class*="skill-card"], [class*="bg-glass"], [class*="rounded-lg"]').count();
    console.log(`  Skill cards: ${skillCards}`);
    
    const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i]').count();
    console.log(`  Search input: ${searchInput}`);
    
    await page.screenshot({ path: '/tmp/skills.png', fullPage: true });
    console.log('  ✓ Screenshot saved');
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  
  // Test 4: Genome page
  console.log('\n📋 TEST 4: Genome (/genome)');
  try {
    await page.goto('http://localhost:5173/genome', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const threeCanvas = await page.locator('canvas').count();
    console.log(`  Three.js canvas: ${threeCanvas}`);
    
    const genomeTitle = await page.locator('h1:has-text("Genome"), h2:has-text("Genome")').count();
    console.log(`  Genome title: ${genomeTitle}`);
    
    await page.screenshot({ path: '/tmp/genome.png', fullPage: true });
    console.log('  ✓ Screenshot saved');
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  
  // Test 5: Tasks page
  console.log('\n📋 TEST 5: Tasks (/tasks)');
  try {
    await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const kanbanColumns = await page.locator('[class*="kanban"], [class*="column"]').count();
    console.log(`  Kanban columns: ${kanbanColumns}`);
    
    await page.screenshot({ path: '/tmp/tasks.png', fullPage: true });
    console.log('  ✓ Screenshot saved');
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  
  // Test 6: Settings page
  console.log('\n📋 TEST 6: Settings (/settings)');
  try {
    await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const tabs = await page.locator('button:has-text("Workspace"), button:has-text("Theme"), button:has-text("Providers"), button:has-text("Dispatcher"), button:has-text("Skills"), button:has-text("About")').count();
    console.log(`  Settings tabs: ${tabs}`);
    
    await page.screenshot({ path: '/tmp/settings.png', fullPage: true });
    console.log('  ✓ Screenshot saved');
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  
  // Test 7: API connectivity from frontend (via Vite proxy)
  console.log('\n📋 TEST 7: Frontend API Proxies');
  const apiEndpoints = [
    '/api/providers',
    '/api/tasks',
    '/api/skills',
    '/api/skills?status=active',
    '/api/providers/meta'
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await page.request.get(`http://localhost:5173${endpoint}`);
      console.log(`  ${endpoint}: ${response.status()}`);
    } catch (e) {
      console.log(`  ${endpoint}: FAILED - ${e.message}`);
    }
  }
  
  // Test 8: Direct backend API
  console.log('\n📋 TEST 8: Direct Backend API');
  const directEndpoints = [
    { url: 'http://localhost:3001/api/tasks', name: 'Node.js /api/tasks' },
    { url: 'http://localhost:3001/api/providers', name: 'Node.js /api/providers' },
    { url: 'http://localhost:3001/api/skills', name: 'Node.js /api/skills' },
    { url: 'http://localhost:8000/api/providers', name: 'Python /api/providers' },
    { url: 'http://localhost:8000/api/graph/status', name: 'Python /api/graph/status' },
  ];
  
  for (const { url, name } of directEndpoints) {
    try {
      const response = await page.request.get(url);
      console.log(`  ${name}: ${response.status()}`);
    } catch (e) {
      console.log(`  ${name}: FAILED - ${e.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n❌ Console Errors (${consoleErrors.length}):`);
  consoleErrors.slice(0, 20).forEach(err => console.log(`  - ${err}`));
  
  console.log(`\n❌ Network Errors (${networkErrors.length}):`);
  networkErrors.forEach(err => console.log(`  - ${err.url}: ${err.status} ${err.statusText}`));
  
  await browser.close();
}

runIntegrationTest().catch(console.error);