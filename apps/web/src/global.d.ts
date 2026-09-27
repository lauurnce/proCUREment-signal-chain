interface Window {
  /** Set to true after the 3D scene has drawn its first full frames. Playwright waits for it. */
  __HQ_READY__?: boolean;
  /** Draw calls and triangles of the last frame. Only set with ?shots=1, for the budget test. */
  __HQ_RENDER_INFO__?: { calls: number; triangles: number };
}
