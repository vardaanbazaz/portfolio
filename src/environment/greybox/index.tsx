import type { EnvironmentModule, EnvironmentProps } from '../contract';

const BACKGROUND = '#0d0d0f';

function GreyboxWorld({ quality }: EnvironmentProps) {
  const low = quality === 'low';
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 6, low ? 30 : 45]} />
      <gridHelper args={[160, low ? 40 : 160, '#3a3a3f', '#1e1e22']} position={[0, 0, -10]} />
    </>
  );
}

export const greyboxEnvironment: EnvironmentModule = {
  World: GreyboxWorld,
};
