import { Perf } from "r3f-perf";

/**
 * r3f-perf: frame rate, GPU and CPU time, draw calls and triangles. Dev only, never in
 * screenshots. Loaded lazily, so it is not in the production bundle.
 */
export function PerfOverlay() {
  return <Perf position="top-right" minimal={false} />;
}
