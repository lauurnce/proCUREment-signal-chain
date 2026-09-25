import { readdir, readFile } from "node:fs/promises";
import type { z } from "zod";
import { parseFrontmatter } from "./frontmatter";

export type ReadResult<T> = { ok: true; value: T } | { ok: false; warning: string };

/** One short, plain-English reason per field, at most three. */
export function describeIssues(error: z.ZodError): string {
  const reasons = error.issues.slice(0, 3).map((issue) => {
    const field = issue.path.length > 0 ? `"${issue.path.join(".")}"` : "The file";
    if (issue.code === "invalid_type" && issue.input === undefined) return `${field} is missing`;
    if (issue.code === "invalid_value") return `${field} has a value that is not allowed`;
    if (issue.code === "unrecognized_keys") return `${field} has fields we do not know`;
    return `${field} is not valid`;
  });
  const more = error.issues.length > 3 ? `, and ${error.issues.length - 3} more` : "";
  return `${reasons.join(", ")}${more}.`;
}

/** Why a file could not be read, in one line, with no full paths. */
function describeReadError(error: unknown, kind: "JSON" | "frontmatter"): string {
  if (error instanceof Error && "code" in error && error.code === "ENOENT")
    return "the file is missing.";
  if (kind === "JSON") return "it is not valid JSON.";
  const line = error instanceof Error && "linePos" in error ? lineOf(error.linePos) : null;
  return line
    ? `the frontmatter is not valid YAML near line ${line}.`
    : "the frontmatter is not valid YAML.";
}

/**
 * The `yaml` package reports positions as [{ line, col }], counted from 1 inside the frontmatter.
 * Add 1 for the opening "---" line, so the number matches the line in the file.
 */
function lineOf(linePos: unknown): number | null {
  const first: unknown = Array.isArray(linePos) ? linePos[0] : null;
  if (
    typeof first === "object" &&
    first !== null &&
    "line" in first &&
    typeof first.line === "number"
  ) {
    return first.line + 1;
  }
  return null;
}

export async function readJson<S extends z.ZodType>(
  path: string,
  label: string,
  schema: S,
): Promise<ReadResult<z.output<S>>> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    return { ok: false, warning: `Skipped ${label}: ${describeReadError(error, "JSON")}` };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, warning: `Skipped ${label}: ${describeIssues(result.error)}` };
  }
  return { ok: true, value: result.data };
}

/** Reads a markdown record. When `withBody` is true, the body is added as `body`. */
export async function readMarkdown<S extends z.ZodType>(
  path: string,
  label: string,
  schema: S,
  withBody: boolean,
): Promise<ReadResult<z.output<S>>> {
  let data: Record<string, unknown>;
  try {
    const parsed = parseFrontmatter(await readFile(path, "utf8"));
    data = withBody ? { ...parsed.data, body: parsed.body } : parsed.data;
  } catch (error) {
    return { ok: false, warning: `Skipped ${label}: ${describeReadError(error, "frontmatter")}` };
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    return { ok: false, warning: `Skipped ${label}: ${describeIssues(result.error)}` };
  }
  return { ok: true, value: result.data };
}

/** Lists markdown files in a folder, sorted by name. A missing folder gives an empty list. */
export async function listMarkdown(dir: string): Promise<string[]> {
  try {
    const names = await readdir(dir);
    return names.filter((name) => name.endsWith(".md")).sort();
  } catch {
    return [];
  }
}

/** Lists sub folders, sorted by name. A missing folder gives an empty list. */
export async function listFolders(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}
