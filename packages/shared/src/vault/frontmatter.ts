import matter from "gray-matter";
import YAML from "yaml";

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

/**
 * Splits a markdown file into YAML frontmatter and body.
 * The `yaml` package keeps dates as strings, and passing options turns off gray-matter's cache.
 */
export function parseFrontmatter(text: string): Frontmatter {
  const parsed = matter(text, {
    engines: { yaml: (source: string) => (YAML.parse(source) ?? {}) as object },
  });
  return { data: parsed.data, body: parsed.content.replace(/^\n+/, "") };
}

/** Turns frontmatter data and a body back into a markdown file, readable in Obsidian. */
export function toMarkdown(data: Record<string, unknown>, body: string): string {
  const yaml = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.replace(/^\n+/, "").trimEnd()}\n`;
}
