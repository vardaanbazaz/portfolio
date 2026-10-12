import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BackSide,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  SrcAlphaFactor,
  type AmbientLight,
  type DirectionalLight,
  type Fog,
  type GridHelper,
  type Mesh,
  type ShaderMaterial,
} from 'three';
import { sceneProbe } from '../../dev/sceneProbe';
import { worldOpacity } from '../backdrops';
import type { EnvironmentModule, EnvironmentProps } from '../contract';
import { blendZones, createZoneState } from '../zones';

/** Radius of the sphere that draws sky and ground. Centred on the origin; the path stays within about 35 of it,
 *  well inside the camera's far plane. */
const DOME_RADIUS = 140;

// One sphere around the scene draws both the sky and the floor, so each pixel is filled once (software WebGL, as in
// headless test browsers, pays for every pixel). Above eye level: the horizon colour easing to the top colour
// overhead. Below: the floor (y = 0) where that view ray meets it, fading into fog by view depth as three's own
// fog does, so it matches the grid and the sections. Worked out per vertex; each pixel only interpolates.
const DOME_VERTEX = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 ground;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying vec3 vColor;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 ray = normalize(world.xyz - cameraPosition);
    vec3 linear;
    if (ray.y >= 0.0) {
      linear = mix(horizon, top, pow(ray.y, 0.6));
    } else {
      vec3 hit = cameraPosition + ray * (cameraPosition.y / -ray.y);
      float depth = -(viewMatrix * vec4(hit, 1.0)).z;
      linear = mix(ground, fogColor, smoothstep(fogNear, fogFar, depth));
    }
    // Linear to sRGB output here rather than per pixel.
    vColor = mix(linear * 12.92, 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), linear));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Faded by `opacity` over a zone's backdrop, which shows through the transparent canvas behind it.
const DOME_FRAGMENT = /* glsl */ `
  uniform float opacity;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, opacity);
  }
`;

function GreyboxWorld({ pathT, quality }: EnvironmentProps) {
  const low = quality === 'low';
  const state = useMemo(createZoneState, []);
  // The starting uniforms. R3F copies each entry into the material's own, so per-frame values are written through
  // `material`; the colour entries keep pointing at the blended colours themselves, so they need no copying.
  const uniforms = useMemo(
    () => ({
      top: { value: state.skyTop },
      horizon: { value: state.skyHorizon },
      ground: { value: state.ground },
      fogColor: { value: state.fogColor },
      fogNear: { value: 0 },
      fogFar: { value: 1 },
      opacity: { value: 1 },
    }),
    [state],
  );
  const dome = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const grid = useRef<GridHelper>(null);
  const fog = useRef<Fog>(null);
  const ambient = useRef<AmbientLight>(null);
  const sun = useRef<DirectionalLight>(null);

  useEffect(() => {
    const mesh = dome.current;
    sceneProbe.dome = mesh;
    return () => {
      if (sceneProbe.dome === mesh) sceneProbe.dome = null;
    };
  }, []);

  useFrame(() => {
    blendZones(pathT.current, quality, state);
    // Where a zone has a backdrop, the dome and grid give way to it; at its own point they aren't drawn.
    const opacity = worldOpacity(pathT.current);
    const drawn = material.current?.uniforms;
    if (drawn) {
      drawn.fogNear.value = state.fogNear;
      drawn.fogFar.value = state.fogFar;
      drawn.opacity.value = opacity;
    }
    if (dome.current) dome.current.visible = opacity > 0;
    if (grid.current) {
      grid.current.visible = opacity > 0;
      grid.current.material.opacity = opacity;
    }
    if (fog.current) {
      fog.current.color.copy(state.fogColor);
      fog.current.near = state.fogNear;
      fog.current.far = state.fogFar;
    }
    if (ambient.current) {
      ambient.current.color.copy(state.ambientColor);
      ambient.current.intensity = state.ambientIntensity;
    }
    if (sun.current) {
      sun.current.color.copy(state.sunColor);
      sun.current.intensity = state.sunIntensity;
    }
  });

  return (
    <>
      {/* No scene background: the canvas clears to transparent, so a backdrop can show behind it. */}
      <fog ref={fog} attach="fog" args={['#000000', 1, 2]} />
      <mesh ref={dome} renderOrder={-1} frustumCulled={false}>
        {/* More rings than a sky alone needs: the floor's fog changes quickly near eye level. */}
        <sphereGeometry args={[DOME_RADIUS, low ? 32 : 48, low ? 24 : 48]} />
        <shaderMaterial
          ref={material}
          side={BackSide}
          depthTest={false}
          depthWrite={false}
          fog={false}
          toneMapped={false}
          // Blended, yet drawn first with the opaque objects: a transparent material would be drawn over them.
          blending={CustomBlending}
          blendSrc={SrcAlphaFactor}
          blendDst={OneMinusSrcAlphaFactor}
          blendSrcAlpha={OneFactor}
          blendDstAlpha={OneMinusSrcAlphaFactor}
          uniforms={uniforms}
          vertexShader={DOME_VERTEX}
          fragmentShader={DOME_FRAGMENT}
        />
      </mesh>
      <gridHelper
        ref={grid}
        args={[160, low ? 40 : 160, '#3a3a3f', '#1e1e22']}
        position={[0, 0, -10]}
        material-transparent
      />
      <ambientLight ref={ambient} />
      <directionalLight ref={sun} position={[5, 10, 5]} />
    </>
  );
}

export const greyboxEnvironment: EnvironmentModule = {
  World: GreyboxWorld,
};
