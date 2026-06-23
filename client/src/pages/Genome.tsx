import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';
import { useNavigate } from 'react-router-dom';
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

const Genome: React.FC = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const nodesRef = useRef<SimulationNode[]>([]);
  const linksRef = useRef<SimulationLink[]>([]);
  const simulationRef = useRef<any>(null);

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
    linkForce.id((d: any) => d.id).distance(80).strength(0.7);

    const sim = forceSimulation<SimulationNode>()
      .nodes(nodes)
      .force('link', linkForce)
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(0, 0, 0))
      .on('tick', () => {
        // Simulation updates node positions directly
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [skills]);

  return (
    <PageShell
      title="Skill Genome"
      subtitle="Evolution 3D view of skill lineage"
    >
      <div className="relative w-full h-[600vh]">
        <div className="absolute inset-0">
          <Canvas
            style={{ height: '100vh', width: '100%' }}
            camera={{ position: [0, 0, 200], fov: 60 }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} />
            <OrbitControls enableZoom enablePan />
            {/* Links */}
            {linksRef.current.map((link, idx) => (
              <LinkLine key={idx} link={link} />
            ))}
            {/* Nodes */}
            {nodesRef.current.map((node) => (
              <SkillNode key={node.id} node={node} navigate={navigate} />
            ))}
          </Canvas>
        </div>
      </div>
    </PageShell>
  );
};

const LinkLine: React.FC<{ link: SimulationLink }> = ({ link }) => {
  const [points, setPoints] = useState(() => new Array(6).fill(0));

  useFrame(() => {
    setPoints([
      link.source.x, link.source.y, link.source.z,
      link.target.x, link.target.y, link.target.z,
    ]);
  });

  return <Line points={points} color="#64748b" lineWidth={2} />;
};

type SkillNodeProps = {
  node: SimulationNode;
  navigate: (path: string) => void;
};

const SkillNode: React.FC<SkillNodeProps> = ({ node, navigate }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulse, setPulse] = useState(1);

  // Pulse if skill fired recently (within 5 minutes)
  useEffect(() => {
    const lastFired = node.skill.lastFiredAt ? new Date(node.skill.lastFiredAt) : null;
    if (!lastFired) {
      setPulse(1);
      return;
    }
    const now = new Date();
    const within = now.getTime() - lastFired.getTime() < 5 * 60 * 1000;
    if (within) {
      const interval = setInterval(() => {
        setPulse((p) => (p > 1.3 ? 1 : p + 0.01));
      }, 30);
      return () => clearInterval(interval);
    } else {
      setPulse(1);
    }
  }, [node.skill.lastFiredAt]);

  const handleClick = () => {
    navigate(`/genome/${node.id}`);
  };

  const color = node.skill.status === 'active' ? '#06b6d4' : '#94a3b8'; // cyan vs slate

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={pulse * (hovered ? 1.2 : 1)}
    >
      <sphereGeometry args={[Math.max(2, Math.log(node.skill.usageCount + 2)), 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={hovered ? '#000000' : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
      />
    </mesh>
  );
};

export { Genome };
export default Genome;