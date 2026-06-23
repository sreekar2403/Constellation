import type { AgentNode, EdgeData, TopologyMode } from '@constellation/shared';

export type LayoutMode = 'neural' | 'timeline' | 'hierarchy' | 'focus';

export interface LayoutResult {
  positions: Record<string, [number, number, number]>;
  /** Whether positions should animate from previous positions */
  animate: boolean;
}

/**
 * Calculate positions for all agents based on the selected layout mode.
 */
export function computeLayout(
  agents: AgentNode[],
  edges: EdgeData[],
  mode: LayoutMode,
  selectedAgentId: string | null
): LayoutResult {
  switch (mode) {
    case 'neural':
      return forceDirectedLayout(agents, edges);
    case 'timeline':
      return timelineLayout(agents);
    case 'hierarchy':
      return hierarchyLayout(agents, edges);
    case 'focus':
      return focusLayout(agents, edges, selectedAgentId);
    default:
      return forceDirectedLayout(agents, edges);
  }
}

/**
 * Neural / Force-directed layout - uses initial random positions.
 * The d3-force simulation takes over from here.
 */
function forceDirectedLayout(
  agents: AgentNode[],
  _edges: EdgeData[]
): LayoutResult {
  const positions: Record<string, [number, number, number]> = {};
  for (const agent of agents) {
    positions[agent.id] = [
      agent.position?.x ?? Math.random() * 4 - 2,
      agent.position?.y ?? Math.random() * 2 - 1,
      agent.position?.z ?? Math.random() * 4 - 2,
    ];
  }
  return { positions, animate: true };
}

/**
 * Timeline layout - agents arranged chronologically along a line.
 * Oldest agents on the left, newest on the right.
 */
function timelineLayout(agents: AgentNode[]): LayoutResult {
  const sorted = [...agents].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const totalWidth = Math.max(agents.length * 0.8, 2);
  const positions: Record<string, [number, number, number]> = {};

  sorted.forEach((agent, i) => {
    const x = (i / Math.max(sorted.length - 1, 1)) * totalWidth - totalWidth / 2;
    const stateOffset = getStateHeightOffset(agent.state);
    positions[agent.id] = [x, stateOffset, 0];
  });

  return { positions, animate: true };
}

/**
 * Hierarchy layout - parent agents at top, children arranged below.
 * Uses a simple tree layout algorithm.
 */
function hierarchyLayout(
  agents: AgentNode[],
  edges: EdgeData[]
): LayoutResult {
  const positions: Record<string, [number, number, number]> = {};
  const children = new Map<string, string[]>();
  const parentOf = new Map<string, string>();

  // Build tree structure from edges
  for (const edge of edges) {
    if (edge.type === 'parent_child') {
      if (!children.has(edge.sourceId)) {
        children.set(edge.sourceId, []);
      }
      children.get(edge.sourceId)!.push(edge.targetId);
      parentOf.set(edge.targetId, edge.sourceId);
    }
  }

  // Find roots (agents with no parent)
  const roots = agents.filter(
    (a) => !parentOf.has(a.id) && a.topologyRole === 'orchestrator'
  );
  // If no orchestrator found, use agents without parents
  const actualRoots =
    roots.length > 0
      ? roots
      : agents.filter((a) => !parentOf.has(a.id));

  // BFS layout
  const ySpacing = 1.5;
  const xSpacing = 1.2;
  let maxY = 0;

  function assignPosition(
    nodeId: string,
    x: number,
    y: number,
    visited: Set<string>
  ): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const agent = agents.find((a) => a.id === nodeId);
    if (!agent) return;

    positions[nodeId] = [x, y, 0];
    maxY = Math.max(maxY, y);

    const kids = children.get(nodeId) ?? [];
    const totalChildWidth = Math.max(kids.length - 1, 0) * xSpacing;
    const startX = x - totalChildWidth / 2;

    kids.forEach((childId, i) => {
      assignPosition(childId, startX + i * xSpacing, y - ySpacing, visited);
    });
  }

  const visited = new Set<string>();
  // Add standalone nodes (not connected to any tree)
  const connectedNodes = new Set<string>();
  for (const edge of edges) {
    connectedNodes.add(edge.sourceId);
    connectedNodes.add(edge.targetId);
  }

  // Position roots
  const rootSpacing = xSpacing * 3;
  const totalRootWidth = Math.max(actualRoots.length - 1, 0) * rootSpacing;
  const rootStartX = -totalRootWidth / 2;

  actualRoots.forEach((root, i) => {
    assignPosition(root.id, rootStartX + i * rootSpacing, 2, visited);
  });

  // Position remaining unvisited (isolated) nodes in a grid
  let gridIdx = 0;
  const unvisited = agents.filter((a) => !visited.has(a.id));
  for (const agent of unvisited) {
    const col = gridIdx % 4;
    const row = Math.floor(gridIdx / 4);
    positions[agent.id] = [
      col * xSpacing - 1.5,
      -maxY - 1 - row * ySpacing,
      0,
    ];
    gridIdx++;
  }

  return { positions, animate: true };
}

/**
 * Focus layout - selected agent centered, others orbit around it.
 * If no agent selected, falls back to force-directed.
 */
function focusLayout(
  agents: AgentNode[],
  edges: EdgeData[],
  selectedAgentId: string | null
): LayoutResult {
  if (!selectedAgentId || !agents.find((a) => a.id === selectedAgentId)) {
    return forceDirectedLayout(agents, edges);
  }

  const positions: Record<string, [number, number, number]> = {};
  const radius = 2;
  const neighbors = new Set<string>();

  // Find direct neighbors via edges
  for (const edge of edges) {
    if (edge.sourceId === selectedAgentId) {
      neighbors.add(edge.targetId);
    }
    if (edge.targetId === selectedAgentId) {
      neighbors.add(edge.sourceId);
    }
  }

  // Center the selected agent
  positions[selectedAgentId] = [0, 0, 0];

  // Orbit neighbors
  const neighborList = Array.from(neighbors);
  neighborList.forEach((neighborId, i) => {
    const angle = (i / Math.max(neighborList.length, 1)) * Math.PI * 2;
    const yOffset = Math.sin(angle * 2) * 0.3;
    positions[neighborId] = [
      Math.cos(angle) * radius,
      yOffset,
      Math.sin(angle) * radius,
    ];
  });

  // Everything else orbits further out
  const others = agents.filter(
    (a) => a.id !== selectedAgentId && !neighbors.has(a.id)
  );
  const outerRadius = 4;
  others.forEach((agent, i) => {
    const angle = (i / Math.max(others.length, 1)) * Math.PI * 2;
    const yOffset = Math.sin(angle * 3) * 0.5;
    positions[agent.id] = [
      Math.cos(angle) * outerRadius,
      yOffset,
      Math.sin(angle) * outerRadius,
    ];
  });

  return { positions, animate: true };
}

/**
 * Height offset based on agent state for visual clarity.
 */
function getStateHeightOffset(state: AgentNode['state']): number {
  switch (state) {
    case 'error':
      return -0.5;
    case 'waiting_for_input':
      return 0.3;
    case 'completed':
      return -0.3;
    default:
      return 0;
  }
}
