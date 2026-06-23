import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { EdgeData } from '@constellation/shared';

interface AgentEdgeLineProps {
  edge: EdgeData;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
}

export const AgentEdgeLine: React.FC<AgentEdgeLineProps> = ({
  edge,
  sourcePos,
  targetPos,
}) => {
  const midY = (sourcePos[1] + targetPos[1]) / 2 + 0.3;

  const curvePoints = useMemo(() => {
    const start = new THREE.Vector3(...sourcePos);
    const mid = new THREE.Vector3(
      (sourcePos[0] + targetPos[0]) / 2,
      midY,
      (sourcePos[2] + targetPos[2]) / 2
    );
    const end = new THREE.Vector3(...targetPos);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(20);
  }, [sourcePos, targetPos, midY]);

  const isActive =
    Date.now() - new Date(edge.lastActivityAt).getTime() < 5000;

  return (
    <Line
      points={curvePoints}
      color={isActive ? '#60a5fa' : '#334155'}
      transparent
      opacity={isActive ? 0.8 : 0.3}
      lineWidth={1}
    />
  );
};
