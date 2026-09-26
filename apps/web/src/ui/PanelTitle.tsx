import type { ReactNode } from "react";
import { typeStyle } from "../theme/style";

/** Panel title with the short accent bar below, an echo of the deck title bar. */
export function PanelTitle({
  as: Tag = "h2",
  id,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Tag id={id} className="m-0 flex items-center gap-2" style={typeStyle("panelTitle")}>
        {children}
      </Tag>
      <div aria-hidden="true" className="h-[3px] w-7 bg-accent" />
    </div>
  );
}
