// A tiny reader for queue item bodies. The vault files use only "## " headings, paragraphs,
// "- " and "1. " lists, and pipe tables, so this is all the panel needs. No HTML is ever built
// from the text, React renders it as plain text.

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] };

export type Section = { heading: string; blocks: Block[] };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

const isDivider = (line: string) => /^\|?\s*:?-{2,}/.test(line.trim());

function readBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();
    if (!line) {
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        const row = lines[i] ?? "";
        if (!isDivider(row)) rows.push(cells(row));
        i++;
      }
      const [header = [], ...rest] = rows;
      blocks.push({ kind: "table", header, rows: rest });
      continue;
    }
    const listMatch = /^(-|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const ordered = listMatch[1] !== "-";
      const items: string[] = [];
      while (i < lines.length && /^(-|\d+\.)\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^(-|\d+\.)\s+/, ""));
        i++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length) {
      const l = (lines[i] ?? "").trim();
      if (!l || l.startsWith("|") || /^(-|\d+\.)\s+/.test(l)) break;
      para.push(l);
      i++;
    }
    blocks.push({ kind: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

/** Splits a body into "## " sections, in file order. Text before the first heading is dropped. */
export function sections(body: string): Section[] {
  const out: Section[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line.trim());
    if (h) {
      if (current) out.push({ heading: current.heading, blocks: readBlocks(current.lines) });
      current = { heading: (h[1] ?? "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) out.push({ heading: current.heading, blocks: readBlocks(current.lines) });
  return out;
}

/** The first paragraph or list item of a section, for one-line previews. */
export function firstLine(section: Section | undefined): string | null {
  const block = section?.blocks[0];
  if (!block) return null;
  if (block.kind === "paragraph") return block.text;
  if (block.kind === "list") return block.items[0] ?? null;
  return null;
}
