import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';

// Custom Link component for Three.js lines
const Link: React.FC<{
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  opacity?: number;
}> = ({ start, end, color = '#6366f1', opacity = 0.3 }) => {
  const lineRef = useRef<THREE.Line | null>(null);

  useFrame(() => {
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position;
      positions.setXYZ(0, start.x, start.y, start.z);
      positions.setXYZ(1, end.x, end.y, end.z);
      positions.needsUpdate = true;
    }
  });

  return (
    <primitive
      object={new THREE.Line(
        new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]), 3)),
        new THREE.LineBasicMaterial({ color, opacity, transparent: true })
      )}
    />
  );
};
import type { Skill } from '@constellation/shared';

interface SimulationNode {
  id: string;
  skill: Skill;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

interface SimulationLink {
  source: SimulationNode;
  target: SimulationNode;
}

interface KnowledgeGraph3DProps {
  className?: string;
}

export const KnowledgeGraph3D: React.FC<KnowledgeGraph3DProps> = ({ className = '' }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const nodesRef = useRef<SimulationNode[]>([]);
  const linksRef = useRef<SimulationLink[]>([]);
  const simulationRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch skills
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch('/api/skills?status=active');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Skill[] = await res.json();
        setSkills(data);
      } catch (err) {
        console.error('Failed to fetch skills:', err);
      }
    };
    fetchSkills();
  }, []);

  // Initialize or restart simulation when skills change
  useEffect(() => {
    if (skills.length === 0) {
      nodesRef.current = [];
      linksRef.current = [];
      if (simulationRef.current) simulationRef.current.stop();
      return;
    }

    // Create node objects
    const nodes: SimulationNode[] = skills.map((skill) => ({
      id: skill.id,
      skill,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }));

    // Create links from parentSkillId
    const idToNode = new Map<string, SimulationNode>();
    nodes.forEach((node) => {
      idToNode.set(node.id, node);
    });

    const links: SimulationLink[] = [];
    skills.forEach((skill) => {
      if (skill.parentSkillId) {
        const source = idToNode.get(skill.parentSkillId);
        const target = idToNode.get(skill.id);
        if (source && target) {
          links.push({ source, target });
        }
      }
    });

    nodesRef.current = nodes;
    linksRef.current = links;

    // Create simulation
    const linkForce = forceLink(links as any) as any;
    linkForce.id((d: any) => d.id).distance(80).strength(0.8);

    const simulation = forceSimulation(nodes as any)
      .force('link', linkForce)
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(0, 0, 0))
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      // Positions updated in simulation
    });

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [skills]);

  if (skills.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-text-tertiary">
          <Sparkles className="mx-auto h-12 w-12 text-text-tertiary/50 mb-4" />
          <p className="text-sm">No active skills to visualize</p>
          <p className="text-xs mt-1">Create skills from patterns to see the genome</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full ${className}`}>
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 0, 150], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 50, 100]} intensity={0.8} />

        {/* Simulation tick — runs inside Canvas so useFrame works */}
        <SimulationTick simulationRef={simulationRef} />

        {/* Links */}
        {linksRef.current.map((link, i) => (
          <Link
            key={`link-${i}`}
            start={new THREE.Vector3(link.source.x, link.source.y, link.source.z)}
            end={new THREE.Vector3(link.target.x, link.target.y, link.target.z)}
            color="#6366f1"
            opacity={0.3}
          />
        ))}

        {/* Nodes */}
        {nodesRef.current.map((node) => (
          <KnowledgeNode
            key={node.id}
            node={node}
            position={[node.x, node.y, node.z]}
          />
        ))}
      </Canvas>
      <div className="absolute bottom-3 left-3 text-[10px] font-mono text-text-tertiary/60">
        {skills.length} skills · {linksRef.current.length} connections
      </div>
    </div>
  );
};

// Runs d3-force simulation tick inside Canvas so useFrame works
const SimulationTick: React.FC<{ simulationRef: React.MutableRefObject<any> }> = ({ simulationRef }) => {
  useFrame(() => {
    const simulation = simulationRef.current;
    if (!simulation) return;
    simulation.tick();
  });
  return null;
};

interface KnowledgeNodeProps {
  node: SimulationNode;
  position: [number, number, number];
}

const KnowledgeNode: React.FC<KnowledgeNodeProps> = ({ node, position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const color = node.skill.status === 'active' ? '#22c55e' : '#f59e0b';

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(...position), 0.1);
    }
  });

  return (
    <group ref={groupRef} position={position} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh>
        <sphereGeometry args={[hovered ? 4 : 3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.5 : 0}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
};