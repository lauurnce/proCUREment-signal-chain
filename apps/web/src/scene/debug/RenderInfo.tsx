import { useFrame } from "@react-three/fiber";

/**
 * Shares the draw calls and triangles of the last frame on window.__HQ_RENDER_INFO__,
 * so the Playwright budget test can check them. Only mounted with ?shots=1.
 * Runs before the render, so it reads the totals of the frame before, shadows included.
 */
export function RenderInfo() {
  useFrame(({ gl }) => {
    const { calls, triangles } = gl.info.render;
    window.__HQ_RENDER_INFO__ = { calls, triangles };
  });
  return null;
}
