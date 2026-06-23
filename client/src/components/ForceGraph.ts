import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
} from 'd3-force-3d';
import type { AgentNode } from '@constellation/shared';

export interface SimNode {
  id: string;
  name: string;
  state: AgentNode['state'];
  tool: AgentNode['tool'];
  parentId: string | null;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

export interface SimLink {
  source: string;
  target: string;
  type: string;
}

type Simulation = ReturnType<typeof forceSimulation<SimNode, SimLink>>;

let simulation: Simulation | null = null;

export function createForceSimulation(
  nodes: SimNode[],
  links: SimLink[],
  onTick: () => void
): Simulation {
  if (simulation) {
    simulation.stop();
  }

  simulation = forceSimulation<SimNode, SimLink>(nodes, links)
    .force('charge', forceManyBody().strength((node: unknown) =>
      (node as SimNode).parentId === null ? -120 : -80
    ))
    .force('link', forceLink<SimLink>(links).id((d: unknown) => (d as SimNode).id).distance(2))
    .force('center', forceCenter(0, 0, 0))
    .force('collision', forceCollide(1.2));

  simulation.on('tick', onTick);

  simulation.alpha(0.8).restart();

  return simulation;
}

export function getSimulation(): Simulation | null {
  return simulation;
}

export function stopSimulation(): void {
  if (simulation) {
    simulation.stop();
    simulation = null;
  }
}
