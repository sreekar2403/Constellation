declare module 'd3-force-3d' {
  export interface SimulationNodeDatum {
    index?: number;
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

  export interface SimulationLinkDatum {
    source: string | number | SimulationNodeDatum;
    target: string | number | SimulationNodeDatum;
  }

  interface Node3D extends SimulationNodeDatum {
    id?: string | number;
  }

  export interface ForceSimulation<
    NodeDatum extends Node3D = Node3D,
    LinkDatum extends SimulationLinkDatum = SimulationLinkDatum
  > {
    nodes<NodeDatum>(): NodeDatum[];
    nodes<NodeDatum>(nodes: NodeDatum[]): this;
    links<LinkDatum>(): LinkDatum[];
    links<LinkDatum>(links: LinkDatum[]): this;
    alpha(alpha: number): this;
    alphaMin(min: number): this;
    alphaDecay(decay: number): this;
    alphaTarget(target: number): this;
    restart(): this;
    stop(): this;
    on(type: string, listener: (() => void) | null): this;
    force(name: string): unknown;
    force(name: string, force: unknown): this;
    find(x: number, y: number, z: number, radius?: number): NodeDatum | undefined;
  }

  export function forceSimulation<
    NodeDatum extends Node3D = Node3D,
    LinkDatum extends SimulationLinkDatum = SimulationLinkDatum
  >(nodes?: NodeDatum[], links?: LinkDatum[]): ForceSimulation<NodeDatum, LinkDatum>;

  export interface ForceManyBody {
    strength(strength: number | ((node: unknown) => number)): ForceManyBody;
  }
  export function forceManyBody(): ForceManyBody;

  export interface ForceLinker {
    id(accessor: (node: unknown) => string | number): ForceLinker;
    distance(distance: number | ((link: unknown) => number)): ForceLinker;
    links(links: readonly SimulationLinkDatum[]): ForceLinker;
  }
  export function forceLink<LinkDatum extends SimulationLinkDatum>(links?: LinkDatum[]): ForceLinker;

  export function forceCenter(x?: number, y?: number, z?: number): unknown;

  export interface ForceCollide {
    radius(radius: number | ((node: unknown) => number)): ForceCollide;
  }
  export function forceCollide(radius?: number | ((node: unknown) => number)): ForceCollide;

  export function forceRadial(radius?: number, x?: number, y?: number, z?: number): unknown;
  export function forceX(x?: number | ((node: unknown) => number)): unknown;
  export function forceY(y?: number | ((node: unknown) => number)): unknown;
  export function forceZ(z?: number | ((node: unknown) => number)): unknown;
}
