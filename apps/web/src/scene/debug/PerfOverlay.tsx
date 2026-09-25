import { StatsGl } from "@react-three/drei";

/** Frame rate and GPU time. Dev only, loaded with ?perf=1. */
export function PerfOverlay() {
  return <StatsGl className="perf-overlay" />;
}
