import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentNode } from '@constellation/shared';

interface AgentNodeMeshProps {
  node: AgentNode;
  position: [number, number, number];
  isSelected: boolean;
  onClick: (id: string) => void;
}

function getNodeColor(state: AgentNode['state']): string {
  const colorMap: Record<string, string> = {
    initializing: '#94a3b8',
    idle: '#22c55e',
    executing: '#3b82f6',
    thinking: '#a855f7',
    waiting_for_input: '#f59e0b',
    completed: '#22c55e',
    error: '#ef4444',
  };
  return colorMap[state] ?? '#94a3b8';
}

function getNodeSize(tool: AgentNode['tool']): number {
  switch (tool) {
    case 'claude-code': return 0.5;
    case 'gemini-cli': return 0.45;
    case 'opencode': return 0.4;
    case 'ollama': return 0.35;
    default: return 0.4;
  }
}

export const AgentNodeMesh: React.FC<AgentNodeMeshProps> = ({
  node,
  position,
  isSelected,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const color = getNodeColor(node.state);
  const size = getNodeSize(node.tool);

  const [hovered, setHovered] = React.useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Subtle float animation
    meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.001 + parseFloat(node.id) || 0) * 0.05;

    // Pulse glow for waiting_for_input
    if (node.state === 'waiting_for_input' && glowRef.current) {
      const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
      glowRef.current.scale.setScalar(1 + pulse * 0.3);
    }
  });

  return (
    <group position={position}>
      {/* Glow / halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Main sphere */}
      <Sphere
        ref={meshRef}
        args={[size, 24, 24]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node.id);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.1}
          emissive={color}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0.05}
        />
      </Sphere>

      {/* Label */}
      <Text
        position={[0, -size - 0.3, 0]}
        fontSize={0.2}
        color="#e2e8f0"
        anchorX="center"
        anchorY="top"
        maxWidth={2}
      >
        {node.name}
      </Text>

      {/* State indicator ring for selected nodes */}
      {isSelected && (
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[size + 0.1, size + 0.25, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
