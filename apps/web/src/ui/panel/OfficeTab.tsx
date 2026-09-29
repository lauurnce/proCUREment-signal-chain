import type { Accessory } from "@hq/shared";
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

/**
 * The Office tab: camera views and light, the props you can switch on and off, sound, the Demo
 * Day placeholder, and what each place in the office is for.
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

      <section className="flex flex-col gap-2" aria-labelledby="office-demo">
        <h3 id="office-demo" className="m-0" style={typeStyle("label", "navy")}>
          Demo Day
        </h3>
        <p className="m-0" style={typeStyle("small")}>
          Plays a sample workday at speed, with fictional items arriving. Coming soon.
        </p>
        <button
          type="button"
          aria-disabled="true"
          className="self-start rounded-button border border-hairline bg-panel px-3 py-1.5"
          style={{ ...typeStyle("small", "inkMuted"), fontWeight: 700 }}
        >
          Start Demo Day
        </button>
      </section>

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
