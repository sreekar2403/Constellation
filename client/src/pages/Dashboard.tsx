import React, { useEffect } from 'react';
import { KPIStrip } from '../components/dashboard/KPIStrip';
import { AIPlatformsPanel } from '../components/dashboard/AIPlatformsPanel';
import { KnowledgeGraph3D } from '../components/dashboard/KnowledgeGraph3D';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useGraphStore } from '../store/useGraphStore';

/**
 * Dashboard — Agent OS landing page (Phase 3 bespoke layout).
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │              KPI STRIP (4 cards)                        │
 * ├──────────┬──────────────────────────────────────────────┤
 * │   AI     │                                              │
 * │ PLATFORMS│          3D KNOWLEDGE-GRAPH BRAIN            │
 * │  PANEL   │                                              │
 * │          │                                              │
 * └──────────┴──────────────────────────────────────────────┤
 */
export const Dashboard: React.FC = () => {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const { fetchGraph, status } = useGraphStore();

  // Fetch graph when workspace is set and we don't already have data
  useEffect(() => {
    if (rootPath && (status === 'idle' || status === 'error')) {
      // Avoid refetching if already loading or ready
      fetchGraph(rootPath);
    }
  }, [rootPath, fetchGraph, status]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* KPI strip */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <KPIStrip />
      </div>

      {/* Main: platforms panel + 3D brain */}
      <div className="flex flex-1 min-h-0 px-4 pb-4 gap-3">
        <div className="w-72 shrink-0">
          <AIPlatformsPanel />
        </div>
        <div className="flex-1 min-h-0">
          <KnowledgeGraph3D className="h-full w-full" />
        </div>
      </div>
    </div>
  );
};