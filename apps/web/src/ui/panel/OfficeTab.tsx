import type { Accessory, DemoSpeed } from "@hq/shared";
import { useState } from "react";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";
import { ViewControls } from "../ViewControls";
import { propName } from "./propName";
import { useSound } from "./soundSetting";

// Places, with one line each (copy deck, section 9), grouped as in the panel spec.
const GROUPS: { label: string; zones: [string, string][] }[] = [
  {
    label: "Work areas",
    zones: [
      ["CM Wing", "Category Manager helpers, the commercial side."],
      ["Ops Wing", "Ops Buyer helpers, the PO side."],
      ["Leads' Row", "Four Lead desks with a view of both wings."],
      ["Sr. Manager's Office", "Your desk and the Needs you tray."],
    ],
  },
  {
    label: "Shared stations",
    zones: [
      ["Endorsement Bridge", "CM helpers hand approved PRs to Ops helpers here."],
      ["SAP Station", "Helpers pull lists, load PRs and amend POs."],
      ["Mail Dock", "Supplier and A/P emails come in and go out."],
      ["Contract Corner", "SOW drafts in Conga, signatures in DocuSign."],
      ["Negotiation Room", "Supplier calls, SOW reviews and awards."],
      ["Huddle Room", "Team huddles and learning sessions."],
      ["Logistics Window", "Deliveries arrive when POs are received."],
    ],
  },
  {
    label: "Arrive and rest",
    zones: [
      ["Reception", "Where you arrive."],
      ["Merienda Corner", "Coffee, snacks and helpers on break."],
    ],
  },
];

const NO_PROPS: Accessory[] = [];

const SWITCH =
  "relative inline-flex h-6 w-10 shrink-0 items-center rounded-pill border transition-colors duration-[140ms] ease-enter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** An on and off switch with a visible label (WCAG 4.1.2: role switch, aria-checked). */
function Toggle({
  label,
  hint,
  on,
  onChange,
  testId,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (on: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline py-2">
      <span className="flex min-w-0 flex-col">
        <span style={typeStyle("tagName")}>{label}</span>
        {hint && <span style={typeStyle("small")}>{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        data-testid={testId}
        onClick={() => onChange(!on)}
        // Off: white track, ink-muted edge and knob (7.5:1). On: accent track, white knob.
        className={`${SWITCH} ${on ? "border-accent bg-accent" : "border-ink-muted bg-white"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0 h-4 w-4 rounded-pill transition-transform duration-[140ms] ease-enter ${on ? "translate-x-[18px] bg-white" : "translate-x-1 bg-ink-muted"}`}
        />
      </button>
    </div>
  );
}

const SPEEDS: DemoSpeed[] = [1, 5, 20];
const clockOf = (iso: string) => iso.slice(11, 16);

async function simPost(path: string, body: object): Promise<void> {
  const response = await fetch(`/api/sim/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!response?.ok) throw new Error("The local server did not answer. Is pnpm dev running?");
}

/**
 * Demo Day: a seeded, simulated workday on its own copy of the vault (vault-demo/), so your vault
 * stays clean. Off by default. The same seed replays the same day.
 */
function DemoDayControls() {
  const demo = useStore((s) => s.data?.demo ?? null);
  const [seed, setSeed] = useState(42);
  const [speed, setSpeed] = useState<DemoSpeed>(5);
  const [error, setError] = useState<string | null>(null);
  const run = (path: string, body: object) => {
    setError(null);
    simPost(path, body).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };
  const current = demo?.speed ?? speed;

  return (
    <section className="flex flex-col" aria-labelledby="office-demo">
      <h3 id="office-demo" className="m-0 pb-1" style={typeStyle("label", "navy")}>
        Demo Day
      </h3>
      <Toggle
        label="Demo Day"
        hint={
          demo
            ? `Simulated ${clockOf(demo.clock)}, seed ${demo.seed}. Your vault is untouched.`
            : "Plays a fictional workday on its own copy of the vault."
        }
        on={Boolean(demo)}
        onChange={(on) => (on ? run("start", { seed, speed }) : run("stop", {}))}
        testId="demo-switch"
      />
      <div className="flex items-center justify-between gap-3 border-t border-hairline py-2">
        <span style={typeStyle("tagName")}>Speed</span>
        <div className="flex gap-1" role="group" aria-label="Demo Day speed">
          {SPEEDS.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={current === x}
              data-testid={`demo-speed-${x}`}
              onClick={() => {
                setSpeed(x);
                if (demo) run("speed", { speed: x });
              }}
              className={`rounded-button border px-2.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                current === x
                  ? "border-accent bg-accent"
                  : "border-hairline bg-white hover:border-accent"
              }`}
              style={{ ...typeStyle("small", current === x ? "white" : "navy"), fontWeight: 700 }}
            >
              {x}x
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 border-t border-hairline py-2">
        <span style={typeStyle("tagName")}>Seed</span>
        <input
          type="number"
          min={0}
          value={demo?.seed ?? seed}
          disabled={Boolean(demo)}
          onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="w-24 rounded-button border border-hairline px-2 py-1 text-right disabled:bg-panel"
          style={typeStyle("small", "ink")}
        />
      </label>
      {error && (
        <p role="alert" className="m-0 pt-1" style={typeStyle("small", "ink")}>
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * The Office tab: camera views and light, the props you can switch on and off, sound, the Demo
 * Day controls, and what each place in the office is for.
 */
export function OfficeTab() {
  const office = useStore((s) => s.data?.office ?? null);
  const props = office?.accessories ?? NO_PROPS;
  const zoneNames = new Map((office?.zones ?? []).map((z) => [z.id, z.name]));
  const sound = useSound();

  // A switch changes this page's copy of the office, so the prop shows or hides at once.
  // Nothing is written: the file stays the source of truth (D-055).
  const setEnabled = (id: string, enabled: boolean) => {
    const { data, setOffice } = useStore.getState();
    if (!data) return;
    setOffice({
      ...data.office,
      accessories: data.office.accessories.map((a) => (a.id === id ? { ...a, enabled } : a)),
    });
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <ViewControls />

      <section className="flex flex-col" aria-labelledby="office-props">
        <h3 id="office-props" className="m-0 pb-1" style={typeStyle("label", "navy")}>
          Props
        </h3>
        {props.length === 0 ? (
          <p className="m-0 border-t border-hairline py-2" style={typeStyle("small")}>
            No props in the office yet.
          </p>
        ) : (
          <>
            {props.map((p) => (
              <Toggle
                key={p.id}
                label={propName(p)}
                hint={zoneNames.get(p.zone) ?? p.zone}
                on={p.enabled}
                onChange={(on) => setEnabled(p.id, on)}
                testId={`prop-${p.id}`}
              />
            ))}
            <p className="m-0 pt-1" style={typeStyle("small")}>
              For this visit only. The next reload brings back the saved setup.
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col" aria-labelledby="office-sound">
        <h3 id="office-sound" className="m-0 pb-1" style={typeStyle("label", "navy")}>
          Sound
        </h3>
        <Toggle
          label="Sound"
          hint="The office has no sounds yet. This keeps your choice for later."
          on={sound.on}
          onChange={sound.setOn}
          testId="sound-switch"
        />
      </section>

      <DemoDayControls />

      {GROUPS.map((g) => (
        <section key={g.label} className="flex flex-col">
          <h3 className="m-0 pb-1" style={typeStyle("label", "navy")}>
            {g.label}
          </h3>
          <ul className="m-0 list-none p-0">
            {g.zones.map(([name, purpose]) => (
              <li key={name} className="flex flex-col border-t border-hairline py-2">
                <span style={typeStyle("tagName")}>{name}</span>
                <span style={typeStyle("small")}>{purpose}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
