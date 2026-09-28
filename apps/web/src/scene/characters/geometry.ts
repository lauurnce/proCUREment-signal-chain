import {
  BoxGeometry,
  type BufferGeometry,
  ExtrudeGeometry,
  Shape as PathShape,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { BASE_SIZE, type Shape } from "./recipe";

function star(outer: number, inner: number) {
  const path = new PathShape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  path.closePath();
  return new ExtrudeGeometry(path, { depth: 0.008, bevelEnabled: false });
}

const rounded = (shape: Shape, radius: number) => {
  const [w, h, d] = BASE_SIZE[shape];
  return new RoundedBoxGeometry(w, h, d, 2, radius);
};

let cache: Record<Shape, BufferGeometry> | null = null;

/** One geometry per shape, made on first use and shared by every helper in every scene. */
export function characterGeometry(shape: Shape): BufferGeometry {
  cache ??= {
    box: new BoxGeometry(1, 1, 1),
    torso: rounded("torso", 0.07),
    head: rounded("head", 0.11),
    hairCap: rounded("hairCap", 0.05),
    star: star(0.042, 0.018),
    // A 3 sided torus is an outline triangle.
    triangle: new TorusGeometry(0.04, 0.009, 4, 3),
    bun: new SphereGeometry(0.12, 12, 8),
    // The headset band: half a ring over the head.
    band: new TorusGeometry(0.3, 0.018, 6, 16, Math.PI),
  };
  return cache[shape];
}
