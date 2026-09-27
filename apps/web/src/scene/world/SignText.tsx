import type { Landmark } from "@hq/shared";
import { useEffect, useMemo } from "react";
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from "three";
import { color, font } from "../../theme/tokens";
import { signFace } from "../layout/recipes";

const SIZE = { width: 1.6, height: 0.4 } as const;
const PIXELS = { width: 1024, height: 256 } as const;

/**
 * The words on the Reception sign, "SignalChain HQ" from the landmark label, in navy
 * Quattrocento Sans on the white sign panel. Drawn once on a canvas after the font loads.
 * Words only: never a logo or wordmark (brand rules).
 */
export function SignText({ landmark }: { landmark: Landmark }) {
  const text = landmark.label ?? "";
  const { position, rotation } = signFace(landmark);

  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = PIXELS.width;
    canvas.height = PIXELS.height;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.9,
      metalness: 0,
    });
    return { texture, material };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const family = font.sans.split(",")[0]?.trim() ?? "sans-serif";
    const draw = () => {
      if (cancelled) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color.navy;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Shrink the type until the words fit with a margin.
      let px = 150;
      do {
        ctx.font = `700 ${px}px ${family}, sans-serif`;
        px -= 4;
      } while (ctx.measureText(text).width > canvas.width * 0.9 && px > 20);
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 6);
      texture.needsUpdate = true;
    };
    document.fonts.load(`700 150px ${family}`).then(draw, draw);
    return () => {
      cancelled = true;
    };
  }, [texture, text]);

  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material],
  );

  if (!text) return null;
  return (
    <mesh position={position} rotation={[0, rotation, 0]} material={material}>
      <planeGeometry args={[SIZE.width, SIZE.height]} />
    </mesh>
  );
}
