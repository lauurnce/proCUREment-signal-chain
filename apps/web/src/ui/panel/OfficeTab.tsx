import { typeStyle } from "../../theme/style";

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
      ["Huddle Room", "Team huddles and AI Enablement sessions."],
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

const PRESETS = ["1 Whole office", "2 CM Wing", "3 Ops Wing", "4 Sr. Manager's Office"];

/** Camera presets and the places in the office. The presets come with the full office in Phase 3. */
export function OfficeTab() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <section className="flex flex-col gap-2">
        <h3 className="m-0" style={typeStyle("label", "navy")}>
          Go to
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-disabled="true"
              title="Camera presets come with the full office in Phase 3."
              className="rounded-button border border-hairline bg-panel px-3 py-2 text-left"
              style={typeStyle("small", "inkMuted")}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="m-0" style={typeStyle("small")}>
          Drag to pan. Scroll to zoom. Presets and Q and E to turn come with the full office.
        </p>
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
