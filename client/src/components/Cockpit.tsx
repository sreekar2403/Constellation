import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { useAgentStore } from '../store/useAgentStore';
import { useUIStore } from '../store/useUIStore';
import { AgentNodeMesh } from './AgentNodeMesh';
import { AgentEdgeLine } from './AgentEdgeLine';
import {
  createForceSimulation,
  stopSimulation,
  type SimNode,
  type SimLink,
} from './ForceGraph';
import {
  computeLayout,
  type LayoutMode,
} from './topology/TopologyEngine';
import { LayoutSelector } from './topology/LayoutSelector';

interface SceneContentProps {
  layoutMode: LayoutMode;
}

const SceneContent: React.FC<SceneContentProps> = ({ layoutMode }) => {
  const agents = useAgentStore((s) => s.agents);
  const edges = useAgentStore((s) => s.edges);
  const selectAgent = useUIStore((s) => s.selectAgent);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);

  // Convert to arrays for rendering
  const agentArray = useMemo(() => Object.values(agents), [agents]);
  const edgeArray = useMemo(() => Object.values(edges), [edges]);
  const agentIds = useMemo(() => Object.keys(agents), [agents]);

  // Track positions
  const [positions, setPositions] = useState<Record<string, [number, number, number]>>({});

  const onBackgroundClick = useCallback(() => {
    selectAgent(null);
  }, [selectAgent]);

  // Initialize / update simulation or layout when agents/edges/layout change
  useEffect(() => {
    if (layoutMode === 'neural') {
      // Use force-directed simulation
      const simNodes: SimNode[] = agentArray.map((a) => ({
        id: a.id,
        name: a.name,
        state: a.state,
        tool: a.tool,
        parentId: a.parentId,
        x: a.position?.x ?? Math.random() * 4 - 2,
        y: a.position?.y ?? 0,
        z: a.position?.z ?? Math.random() * 4 - 2,
      }));

      const simLinks: SimLink[] = edgeArray.map((e) => ({
        source: e.sourceId,
        target: e.targetId,
        type: e.type,
      }));

      const sim = createForceSimulation(simNodes, simLinks, () => {
        const newPositions: Record<string, [number, number, number]> = {};
        const simNodesResult = sim.nodes();
        for (const n of simNodesResult) {
          const node = n as { id: string; x?: number; y?: number; z?: number };
          newPositions[node.id] = [node.x ?? 0, node.y ?? 0, node.z ?? 0];
        }
        setPositions(newPositions);
      });

      return () => {
        stopSimulation();
      };
    } else {
      // Use topology engine for deterministic layouts
      stopSimulation();
      const result = computeLayout(
        agentArray,
        edgeArray,
        layoutMode,
        selectedAgentId
      );
      setPositions(result.positions);
      return () => {};
    }
  }, [agentIds.join(','), edgeArray.length, layoutMode, selectedAgentId]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#6366f1" />

      {/* Background stars */}
      <Stars radius={50} depth={50} count={2000} factor={4} fade speed={1} />

      {/* Edges */}
      {edgeArray.map((edge) => {
        const sourcePos = positions[edge.sourceId] ?? [0, 0, 0];
        const targetPos = positions[edge.targetId] ?? [0, 0, 0];
        return (
          <AgentEdgeLine
            key={edge.id}
            edge={edge}
            sourcePos={sourcePos}
            targetPos={targetPos}
          />
        );
      })}

      {/* Nodes */}
      {agentArray.map((agent) => {
        const pos = positions[agent.id] ?? [
          agent.position?.x ?? 0,
          agent.position?.y ?? 0,
          agent.position?.z ?? 0,
        ];
        return (
          <AgentNodeMesh
            key={agent.id}
            node={agent}
            position={pos as [number, number, number]}
            isSelected={agent.id === selectedAgentId}
            onClick={(id) => selectAgent(id)}
          />
        );
      })}

      {/* Clickable background plane for deselection */}
      <mesh onClick={onBackgroundClick} visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0} />
      </mesh>

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
};

interface CockpitProps {
  workingDirectory?: string;
}

export const Cockpit: React.FC<CockpitProps> = ({ workingDirectory }) => {
  const agents = useAgentStore((s) => s.agents);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('neural');

  const isEmpty = Object.keys(agents).length === 0;

  const handleLayoutChange = useCallback((mode: LayoutMode) => {
    stopSimulation();
    setLayoutMode(mode);
  }, []);

  // Show a short project name from the working directory
  const projectName = workingDirectory
    ? workingDirectory.split(/[/\\]/).pop() || workingDirectory
    : '';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <AdaptiveDpr pixelated />
        {!isEmpty && <SceneContent layoutMode={layoutMode} />}
      </Canvas>

      {/* Layout mode selector — only show when agents exist */}
      {!isEmpty && (
        <LayoutSelector currentMode={layoutMode} onChange={handleLayoutChange} />
      )}

      {isEmpty ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#64748b',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#6366f1' }}>
            ✦
          </div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
            Agent starting in
          </div>
          {projectName && (
            <div
              style={{
                fontSize: '0.7rem',
                color: '#6366f1',
                marginTop: 8,
                padding: '4px 12px',
                borderRadius: 4,
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                fontFamily: 'monospace',
                display: 'inline-block',
              }}
            >
              📁 {projectName}
            </div>
          )}
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.7rem',
              color: '#475569',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#6366f1',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }}
            />
            <style>{`
              @keyframes pulse-dot {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.2); }
              }
            `}</style>
            Waiting for agent to connect...
          </div>
        </div>
      ) : (
        /* Project indicator badge */
        projectName && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.6rem',
              color: '#475569',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '2px 10px',
              borderRadius: 4,
              border: '1px solid #1e293b',
              pointerEvents: 'none',
            }}
          >
            📁 {projectName}
          </div>
        )
      )}
    </div>
  );
};
