import type { Workflow, Zone } from "@hq/shared";
import { color, font, world } from "../../theme/tokens";
import { routeFor } from "./routes";
import { ROUTE_STYLE, zoneFill } from "./style";
import type { FloorPlan, Point } from "./types";

type Props = {
  plan: FloorPlan;
  zones: Zone[];
  workflows: Workflow[];
  visibleRoutes: Set<string>;
};

const PAD = 1.6;
const DESK = { w: 1.4, d: 0.7 };
/** A white outline behind text, so labels stay readable on top of route lines. */
const HALO = { stroke: color.white, strokeWidth: 0.14, paintOrder: "stroke" } as const;

const toPath = (points: Point[]) =>
  points.map(([x, z], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${z.toFixed(2)}`).join(" ");

/** Small shifts so routes on the same walkway sit side by side instead of on top of each other. */
const shift = (n: number): Point => [((n % 3) - 1) * 0.22, (Math.floor((n - 1) / 3) - 0.5) * 0.3];

/**
 * Top-down floor plan in meters. The back walls are the top and left edges (z = 0 and x = 0),
 * and the isometric camera looks in from the bottom right corner.
 * Drawn in layers: zones, walkways, desks, routes, then all labels on top.
 */
export function PlanDrawing({ plan, zones, workflows, visibleRoutes }: Props) {
  const { width, depth } = plan.size;
  const nameOf = (id: string) => zones.find((z) => z.id === id)?.name ?? id;
  const edges = plan.walkways.edges.flatMap(([a, b]) => {
    const p = plan.walkways.nodes[a];
    const q = plan.walkways.nodes[b];
    return p && q ? [{ key: `${a}-${b}`, p, q }] : [];
  });
  const routes = workflows.flatMap((w) => {
    const style = ROUTE_STYLE[w.id];
    if (!style || !visibleRoutes.has(w.id) || (w.track !== "CM" && w.track !== "OPS")) return [];
    const route = routeFor(
      plan,
      w.steps.map((s) => s.zone),
      w.track,
    );
    return [{ id: w.id, style, points: route.points, offset: shift(style.number) }];
  });

  return (
    <svg
      data-testid={`floorplan-${plan.id}`}
      viewBox={`${-PAD} ${-PAD} ${width + PAD * 2} ${depth + PAD * 2}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Floor plan option ${plan.id}, ${plan.name}`}
      style={{ fontFamily: font.sans }}
    >
      {/* Floor, back walls (top and left) and the open front edges */}
      <rect x={0} y={0} width={width} height={depth} fill={world.floorWood} />
      <path
        d={`M${width} 0 L0 0 L0 ${depth}`}
        fill="none"
        stroke={world.wallTrim}
        strokeWidth={0.3}
      />
      <path
        d={`M0 ${depth} L${width} ${depth} L${width} 0`}
        fill="none"
        stroke={world.slabEdge}
        strokeWidth={0.08}
        strokeDasharray="0.3 0.3"
      />

      {/* Zones */}
      {plan.zones.map((z) => {
        const [x, y, w, d] = z.rect;
        const hero = z.id === "endorsement-bridge";
        return (
          <rect
            key={z.id}
            x={x}
            y={y}
            width={w}
            height={d}
            rx={0.25}
            fill={zoneFill(z.id)}
            stroke={hero ? color.navy : world.wallTrim}
            strokeOpacity={hero ? 1 : 0.35}
            strokeWidth={hero ? 0.12 : 0.05}
          />
        );
      })}

      {/* Walkways, 1.2 m wide, on top of the zone tints so you can see where helpers walk */}
      {edges.map(({ key, p, q }) => (
        <line
          key={key}
          x1={p[0]}
          y1={p[1]}
          x2={q[0]}
          y2={q[1]}
          stroke={color.white}
          strokeOpacity={0.75}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}

      {/* Desks with seat ids */}
      {plan.desks.map((desk) => {
        const turned = desk.facing === 90 || desk.facing === 270;
        const w = turned ? DESK.d : DESK.w;
        const d = turned ? DESK.w : DESK.d;
        return (
          <g key={desk.seat}>
            <rect
              x={desk.pos[0] - w / 2}
              y={desk.pos[1] - d / 2}
              width={w}
              height={d}
              rx={0.06}
              fill={world.deskTop}
              stroke={world.deskEdge}
              strokeWidth={0.05}
            />
            <text
              x={desk.pos[0]}
              y={desk.pos[1] + 0.1}
              fontSize={0.26}
              textAnchor="middle"
              fill={color.ink}
              style={{ fontFamily: font.mono }}
            >
              {desk.seat.replace("-", " ").toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Workflow route lines */}
      {routes.map((r) => (
        <path
          key={r.id}
          transform={`translate(${r.offset[0]} ${r.offset[1]})`}
          d={toPath(r.points)}
          fill="none"
          stroke={r.style.color}
          strokeWidth={0.14}
          strokeDasharray={r.style.dash || undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* Zone names and landmarks, above the routes */}
      {plan.zones.map((z) => {
        const [x, y] = z.rect;
        return (
          <g key={z.id}>
            <text
              x={x + 0.25}
              y={y + 0.55}
              fontSize={0.42}
              fontWeight={700}
              fill={color.navy}
              {...HALO}
            >
              {nameOf(z.id)}
            </text>
            {z.landmark && (
              <text x={x + 0.25} y={y + 1.0} fontSize={0.3} fill={color.inkMuted} {...HALO}>
                {z.landmark}
              </text>
            )}
          </g>
        );
      })}

      {/* Route start markers with their number, on top of everything */}
      {routes.map((r) => {
        const start = r.points[0] as Point;
        return (
          <g key={r.id} transform={`translate(${r.offset[0]} ${r.offset[1]})`}>
            <circle
              cx={start[0]}
              cy={start[1]}
              r={0.3}
              fill={r.style.color}
              stroke={color.white}
              strokeWidth={0.06}
            />
            <text
              x={start[0]}
              y={start[1] + 0.12}
              fontSize={0.34}
              fontWeight={700}
              textAnchor="middle"
              fill={color.white}
            >
              {r.style.number}
            </text>
          </g>
        );
      })}

      {/* Doors on the open edges. Labels sit outside the floor. */}
      {plan.doors.map((door) => {
        const onRightEdge = door.at[0] >= width - 0.01;
        return onRightEdge ? (
          <g key={door.id}>
            <rect
              x={door.at[0] - 0.15}
              y={door.at[1] - 0.5}
              width={0.3}
              height={1}
              fill={color.accent}
            />
            <text
              x={door.at[0] + 0.55}
              y={door.at[1]}
              fontSize={0.3}
              textAnchor="middle"
              fill={color.accent}
              transform={`rotate(90 ${door.at[0] + 0.55} ${door.at[1]})`}
            >
              {door.label}
            </text>
          </g>
        ) : (
          <g key={door.id}>
            <rect
              x={door.at[0] - 0.5}
              y={door.at[1] - 0.15}
              width={1}
              height={0.3}
              fill={color.accent}
            />
            <text
              x={door.at[0]}
              y={door.at[1] + 0.7}
              fontSize={0.3}
              textAnchor="middle"
              fill={color.accent}
            >
              {door.label}
            </text>
          </g>
        );
      })}

      {/* Camera hint in the front corner */}
      <g transform={`translate(${width + 0.4} ${depth + 0.4})`}>
        <path
          d="M0.9 0.9 L0.1 0.1 M0.1 0.1 L0.5 0.1 M0.1 0.1 L0.1 0.5"
          stroke={color.navy}
          strokeWidth={0.08}
          fill="none"
        />
        <text x={-0.2} y={1.1} fontSize={0.28} textAnchor="end" fill={color.inkMuted}>
          Camera
        </text>
      </g>
    </svg>
  );
}
