# Integration Fix Plan - Constellation Agent OS

## Issues Identified from Integration Testing

### Critical API Missing Endpoints (Node.js server on port 3001)
- `/api/providers` - Returns 404 (Python has it on 8000)
- `/api/providers/meta` - Returns 404 (Python doesn't have it either)
- `/api/skills` - Returns 404
- `/api/skills?status=active` - Returns 404
- `/api/patterns/pending` - Returns 404

### UI Rendering Issues
- **Dashboard**: No KPI Strip, no AI Platforms Panel, no 3D Graph canvas
- **Platforms**: 0 provider cards (only Refresh button visible)
- **Skills**: 0 skill cards, no search input
- **Genome**: 3D canvas renders but no data loaded
- **Settings**: 0 tabs visible
- **Tasks**: Works (has `/api/tasks`)

### Architecture Mismatch
- Frontend Vite proxy → `http://localhost:3001` (Node.js)
- Python API → `http://localhost:8000` (has `/api/providers`)
- Node.js missing v3.0 Agent OS endpoints

---

## Task Breakdown

### Task 1: Add `/api/providers` endpoint to Node.js server
**File**: `server/src/index.ts`
**Requirements**:
- GET `/api/providers` - List all providers from ProviderRegistry
- Should return provider configs with health status
- Use existing `providerStore` or `registry` from server

### Task 2: Add `/api/providers/meta` endpoint to Node.js server
**File**: `server/src/index.ts`
**Requirements**:
- GET `/api/providers/meta` - Return provider metadata (displayName, icon, brandColor, type, capabilities, isLive, error)
- Should match `ProviderMeta` shape expected by Platforms page

### Task 3: Add `/api/skills` endpoint to Node.js server
**File**: `server/src/index.ts`
**Requirements**:
- GET `/api/skills` - List all skills from SkillStore
- Support query param `?status=active` for Genome page
- Return array of Skill objects

### Task 4: Add `/api/patterns/pending` endpoint to Node.js server
**File**: `server/src/index.ts`
**Requirements**:
- GET `/api/patterns/pending` - Return pending patterns from PatternStore
- Used by PatternStore.hydratePending()

### Task 5: Fix Dashboard - Add 3D Knowledge Graph component
**File**: `client/src/pages/Dashboard.tsx`
**Requirements**:
- Import and render the 3D graph component (likely `Genome` or a dedicated `KnowledgeGraph3D` component)
- Ensure layout is scrollable (flex-1 min-h-0)
- Maintain KPI Strip and AI Platforms Panel

### Task 6: Fix Platforms page - Ensure provider cards render
**File**: `client/src/pages/Platforms.tsx` and `client/src/components/platforms/ProviderCard.tsx`
**Requirements**:
- Verify ProviderCard component works with data from `/api/providers/meta`
- Handle loading/error states properly

### Task 7: Fix Skills page - Ensure skill cards render
**File**: `client/src/pages/Skills.tsx` and `client/src/components/skills/SkillGrid.tsx`
**Requirements**:
- Verify SkillGrid works with data from `/api/skills`
- Handle loading/error states

### Task 8: Fix Genome page - Load skills data
**File**: `client/src/pages/Genome.tsx`
**Requirements**:
- Ensure fetch to `/api/skills?status=active` works
- Render 3D force graph with skill nodes

### Task 9: Fix Settings page - Ensure tabs render
**File**: `client/src/pages/Settings.tsx`
**Requirements**:
- Verify tabs are visible and functional
- Check imports of SettingsTab components

### Task 10: End-to-end verification
**Type**: Playwright integration test
**Requirements**:
- Run full test suite again
- Verify all 28 console errors resolved
- Verify all pages render with data

---

## Execution Order

**Parallel Group 1** (API endpoints - independent):
- Task 1: `/api/providers`
- Task 2: `/api/providers/meta` 
- Task 3: `/api/skills`
- Task 4: `/api/patterns/pending`

**Parallel Group 2** (Frontend fixes - depend on Group 1):
- Task 5: Dashboard 3D Graph
- Task 6: Platforms page
- Task 7: Skills page
- Task 8: Genome page
- Task 9: Settings page

**Final**:
- Task 10: E2E verification