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
