import type { ReactNode } from "react";
import { typeStyle } from "../../theme/style";
import { PanelTitle } from "../../ui/PanelTitle";

/** A titled block in the Lab, with the deck-style accent bar under the title. */
export function LabSection({
  id,
  number,
  title,
  intro,
  children,
}: {
  id: string;
  number: number;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-testid={`lab-${id}`}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-5 rounded-card border border-hairline bg-white p-8"
    >
      <header className="flex flex-col gap-2">
        <span style={typeStyle("label", "inkMuted")}>Section {number}</span>
        <PanelTitle id={`${id}-title`}>{title}</PanelTitle>
        <p className="m-0 max-w-2xl" style={typeStyle("body", "inkMuted")}>
          {intro}
        </p>
      </header>
      {children}
    </section>
  );
}
