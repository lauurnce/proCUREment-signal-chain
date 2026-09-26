import { typeStyle } from "../../theme/style";
import type { Section } from "./markdown";

/** One "## " section of an item body: paragraphs, lists and tables as plain text. */
export function BodySection({ section, title }: { section: Section; title?: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="m-0" style={typeStyle("label")}>
        {title ?? section.heading}
      </h4>
      {section.blocks.map((b, i) => {
        const key = `${section.heading}-${i}`;
        if (b.kind === "paragraph") {
          return (
            <p key={key} className="m-0" style={typeStyle("body")}>
              {b.text}
            </p>
          );
        }
        if (b.kind === "list") {
          const List = b.ordered ? "ol" : "ul";
          return (
            <List
              key={key}
              className={`m-0 flex flex-col gap-1 pl-5 ${b.ordered ? "list-decimal" : "list-[square]"}`}
              style={typeStyle("body")}
            >
              {b.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </List>
          );
        }
        return (
          <div key={key} className="overflow-x-auto rounded-button border border-hairline">
            <table className="w-full border-collapse" style={typeStyle("small", "ink")}>
              <thead>
                <tr className="bg-panel">
                  {b.header.map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1.5 text-left whitespace-nowrap"
                      style={{ fontWeight: 700 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row) => (
                  <tr key={row.join("|")} className="border-t border-hairline">
                    {row.map((cell, c) => (
                      <td
                        key={`${row[0]}-${b.header[c] ?? c}`}
                        className={`px-2 py-1.5 whitespace-nowrap ${c === 0 ? "sticky left-0 bg-white" : ""}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}
