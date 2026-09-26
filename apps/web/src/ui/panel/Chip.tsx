import { typeStyle } from "../../theme/style";

/** A small mono label chip, like "Email draft" or "Deciding as CM 02 (demo)". */
export function Chip({ text }: { text: string }) {
  return (
    <span
      className="rounded-chip border border-hairline bg-white px-1.5 py-0.5"
      style={typeStyle("label")}
    >
      {text}
    </span>
  );
}
