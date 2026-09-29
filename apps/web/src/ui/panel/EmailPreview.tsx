import type { QueueItem } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { EMAIL_NOTE } from "./itemView";
import type { Section } from "./markdown";

/** The email draft as it would look: every recipient, the subject and the message. Drafts only. */
export function EmailPreview({
  email,
  draft,
}: {
  email: NonNullable<QueueItem["email"]>;
  draft: Section | undefined;
}) {
  const rows = [
    { label: "To", value: email.to.join(", ") },
    ...(email.cc.length > 0 ? [{ label: "Cc", value: email.cc.join(", ") }] : []),
    { label: "Subject", value: email.subject },
  ];
  const paragraphs = draft?.blocks.flatMap((b) =>
    b.kind === "paragraph" ? [b.text] : b.kind === "list" ? b.items : [],
  );
  return (
    <section data-testid="email-preview" className="flex flex-col gap-2">
      <h4 className="m-0" style={typeStyle("label")}>
        Email draft
      </h4>
      <div className="flex flex-col rounded-button border border-hairline bg-white">
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 border-b border-hairline p-3">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt style={typeStyle("small")}>{r.label}</dt>
              <dd className="m-0 break-words" style={typeStyle("small", "ink")}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2 p-3">
          <span style={typeStyle("label", "inkMuted")}>Message</span>
          {paragraphs?.map((p) => (
            <p key={p} className="m-0" style={typeStyle("body")}>
              {p}
            </p>
          ))}
        </div>
        <p className="m-0 border-t border-hairline px-3 py-2" style={typeStyle("small")}>
          Unofficial prototype · Fictional data
        </p>
      </div>
      <p className="m-0" style={typeStyle("small")}>
        {EMAIL_NOTE} Nothing is sent from here.
      </p>
    </section>
  );
}
