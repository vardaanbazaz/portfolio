import { Stats } from '@react-three/drei';

/** Frame-rate readout. Loaded only in dev or with ?fps in the URL. */
export default function FpsReadout() {
  return <Stats />;
}
