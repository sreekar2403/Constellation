/// <reference types="three"/>
import React, { useEffect, useRef } from 'react';
import { Points, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../store/useGraphStore';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
} from 'd3-force-3d';

export interface SimNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  extension: string;
  size: number;
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

export const ForceGraph: React.FC = () => {
  const { graph, status } = useGraphStore();
  const pointsRef = useRef<THREE.Points | null>(null);
  const nodesRef = useRef<SimNode[]>([]); // stores latest simulated nodes

  // Initialize simulation when graph data arrives
  useEffect(() => {
    if (!graph || !graph.nodes) return;

    const nodes: SimNode[] = graph.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      extension: n.extension,
      size: n.size,
      x: n.x ?? Math.random() * 4 - 2,
      y: n.y ?? Math.random() * 4 - 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }));

    const links: SimLink[] = graph.edges.map((e) => ({
      source: e.source instanceof Object ? (e.source as any).id : e.source,
      target: e.target instanceof Object ? (e.target as any).id : e.target,
      type: e.type,
    }));

    // Create simulation
    simulation = forceSimulation<SimNode, SimLink>(nodes, links)
      .force('charge', forceManyBody().strength((node) => -30))
      .force('link', forceLink(links).id((d: SimNode) => d.id).distance(2))
      .force('center', forceCenter(0, 0, 0))
      .on('tick', () => {
        // Update nodesRef with latest positions (nodes array is mutated in place)
        nodesRef.current = nodes.map((n) => ({ ...n }));
      });

    // Start simulation
    simulation.alpha(0.8).restart();

    // Cleanup
    return () => {
      if (simulation) {
        simulation.stop();
        simulation = null;
      }
    };
  }, [graph]);

  // If no graph, show placeholder points (static sphere)
  useEffect(() => {
    if (graph && graph.nodes && graph.nodes.length > 0) return;
    // fallback to original sphere
    const count = 50;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 2;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * i;

      positions[i3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i3 + 2] = radius * Math.cos(phi);

      color.setHSL(i / count, 0.5, 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    if (pointsRef.current) {
      pointsRef.current.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      pointsRef.current.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
  }, [graph]);

  return (
    <>
      {/* Nodes as Points */}
      <points
        ref={pointsRef}
      />
      {/* Edges as Lines */}
      {graph?.edges?.map((edge, index) => {
        const sourceNode = nodesRef.current.find(
          (n) => n.id === (edge instanceof Object ? (edge.source as any).id : edge.source)
        );
        const targetNode = nodesRef.current.find(
          (n) => n.id === (edge instanceof Object ? (edge.target as any).id : edge.target)
        );
        if (!sourceNode || !targetNode) return null;
        const sourcePos = [sourceNode.x ?? 0, sourceNode.y ?? 0, sourceNode.z ?? 0];
        const targetPos = [targetNode.x ?? 0, targetNode.y ?? 0, targetNode.z ?? 0];
        return (
          <Line
            key={index}
            points={[
              sourcePos[0],
              sourcePos[1],
              sourcePos[2],
              targetPos[0],
              targetPos[1],
              targetPos[2],
            ]}
            color="#6366f1"
            lineWidth={1}
            opacity={0.5}
          />
        );
      })}
    </>
  );
};