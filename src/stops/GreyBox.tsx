import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { MeshStandardMaterial } from 'three';
import type { StopVisualProps } from './contract';

interface GreyBoxProps extends StopVisualProps {
  halfExtents: [number, number, number];
}

/** Shared grey-box body for the prototype stop visuals. */
export function GreyBox({ halfExtents, proximity, hovered, quality }: GreyBoxProps) {
  const material = useRef<MeshStandardMaterial>(null);
  const [x, y, z] = halfExtents;

  useFrame(() => {
    if (material.current) {
      material.current.emissiveIntensity = 0.04 + proximity.current * 0.12 + (hovered ? 0.1 : 0);
    }
  });

  return (
    <mesh scale={hovered ? 1.04 : 1}>
      <boxGeometry args={[x * 2, y * 2, z * 2]} />
      <meshStandardMaterial ref={material} color="#8a8a8a" emissive="#ffffff" roughness={0.9} />
      {quality === 'high' && <Edges color="#c8c8c8" />}
    </mesh>
  );
}
