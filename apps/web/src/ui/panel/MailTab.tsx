import {
  composeEmail,
  emailAsText,
  type MailOverview,
  type MailStatus,
  mailtoUrl,
  type QueueItem,
} from "@hq/shared";
import { useEffect, useState } from "react";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";

const BUTTON =
  "inline-flex items-center rounded-button border border-hairline bg-white px-2.5 py-1 no-underline hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

const DRIVER: Record<MailStatus["driver"], string> = {
  outbox: "Outbox: drafts are saved as .eml files in your vault",
  graph: "Outlook: drafts go to your Outlook Drafts folder",
  "power-automate": "Power Automate bridge",
};
const MODE: Record<MailStatus["mode"], string> = {
  "dry-run": "Dry run. Nothing is created, the log shows what would happen.",
  drafts: "Drafts only. Nothing is sent.",
  send: "Drafts, and Send now for addresses on your allowed list.",
};

/** GET /api/mail, again when Demo Day starts or stops (it changes the driver). */
function useMailOverview(): MailOverview | null {
  const demoOn = useStore((s) => Boolean(s.data?.demo));
  const [overview, setOverview] = useState<MailOverview | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: demoOn is the trigger
  useEffect(() => {
    let live = true;
    fetch("/api/mail")
      .then((r) => (r.ok ? (r.json() as Promise<MailOverview>) : null))
      .then((o) => live && setOverview(o))
      .catch(() => live && setOverview(null));
    return () => {
      live = false;
    };
  }, [demoOn]);
  return overview;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hairline py-2">
      <dt style={typeStyle("tagName")}>{label}</dt>
      <dd className="m-0 text-right" style={typeStyle("small", "ink")}>
        {value}
      </dd>
    </div>
  );
}

/** One approved email: who it goes to, and the human ways to send it (outbox, no sign-in). */
function DraftRow({ item, paused }: { item: QueueItem; paused: boolean }) {
  const [said, setSaid] = useState("");
  const email = composeEmail(item);
  const mail = item.mail;
  if (!mail) return null;
  const mailto = email ? mailtoUrl(email) : null;

  const copy = () => {
    if (!email) return;
    navigator.clipboard
      .writeText(emailAsText(email))
      .then(() => setSaid("Email copied. Paste it into a new email in Outlook."))
      .catch(() => setSaid("Could not copy. Use Download .eml instead."));
  };
  const redraft = () => {
    setSaid("");
    fetch(`/api/mail/items/${encodeURIComponent(item.id)}/draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => null)) as { error?: string } | null;
          setSaid(body?.error ?? "The draft could not be made.");
        }
      })
      .catch(() => setSaid("Could not reach the local server."));
  };

  return (
    <li className="flex flex-col gap-1.5 border-t border-hairline py-3" data-testid="mail-draft">
      <span style={typeStyle("tagName")}>{email?.subject ?? item.title}</span>
      <span style={typeStyle("small")}>
        To {mail.to.join(", ") || "nobody yet"}.{" "}
        {mail.state === "draft" && "Draft ready. Nothing was sent."}
        {mail.state === "dry-run" && "Dry run, no draft was made."}
        {mail.state === "sent" && "Sent."}
        {mail.state === "failed" && `Not made: ${mail.problem ?? "something went wrong."}`}
      </span>
      {email && mail.state !== "failed" && (
        <div className="flex flex-wrap gap-1.5">
          {mailto && (
            <a
              href={mailto.url}
              className={BUTTON}
              style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
            >
              Open in Outlook
            </a>
          )}
          <button
            type="button"
            onClick={copy}
            className={BUTTON}
            style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
          >
            Copy email
          </button>
          <a
            href={`/api/mail/items/${encodeURIComponent(item.id)}/eml`}
            download={`${item.id}.eml`}
            data-testid="download-eml"
            className={BUTTON}
            style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
          >
            Download .eml
          </a>
        </div>
      )}
      {mailto && !mailto.withBody && mail.state !== "failed" && (
        <span style={typeStyle("small")}>
          This email is too long for Open in Outlook, so only the subject goes in. Use Copy email
          for the text.
        </span>
      )}
      {mail.state === "failed" && (
        <button
          type="button"
          disabled={paused}
          onClick={redraft}
          className={`${BUTTON} self-start`}
          style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
        >
          Make the draft again
        </button>
      )}
      <span aria-live="polite" style={typeStyle("small", "ink")}>
        {said}
      </span>
    </li>
  );
}

/**
 * The Mail tab (D-117): how email leaves the app, the drafts your approvals made, the sent log,
 * and the mail settings from .env (read-only). Approve makes a draft. Sending is always a
 * separate, human step.
 */
export function MailTab({ queue, paused }: { queue: QueueItem[]; paused: boolean }) {
  const overview = useMailOverview();
  const status = overview?.status;
  const drafts = queue
    .filter((q) => q.mail)
    .sort((a, b) => (b.mail?.createdAt ?? "").localeCompare(a.mail?.createdAt ?? ""));

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <section className="flex flex-col" aria-labelledby="mail-status">
        <h3 id="mail-status" className="m-0 pb-1" style={typeStyle("label", "navy")}>
          Status
        </h3>
        {status ? (
          <dl className="m-0">
            <Row label="How email leaves" value={DRIVER[status.driver]} />
            <Row label="Mode" value={MODE[status.mode]} />
            <Row label="Outlook account" value={status.account ?? "Not connected"} />
          </dl>
        ) : (
          <p className="m-0" style={typeStyle("small")}>
            Loading mail settings...
          </p>
        )}
        {status?.problem && (
          <p
            className="m-0 pt-1"
            role="note"
            data-testid="mail-problem"
            style={typeStyle("small", "ink")}
          >
            {status.problem}
          </p>
        )}
      </section>

      <section className="flex flex-col" aria-labelledby="mail-drafts">
        <h3 id="mail-drafts" className="m-0 pb-1" style={typeStyle("label", "navy")}>
          Drafts
        </h3>
        {drafts.length === 0 ? (
          <p className="m-0" style={typeStyle("small")}>
            No drafts yet. Approve an email in Needs you, and its draft shows here.
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {drafts.map((item) => (
              <DraftRow key={item.id} item={item} paused={paused} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col" aria-labelledby="mail-sent">
        <h3 id="mail-sent" className="m-0 pb-1" style={typeStyle("label", "navy")}>
          Sent
        </h3>
        <p className="m-0" style={typeStyle("small")}>
          Nothing sent from the app. Send now comes with the Outlook sign-in.
        </p>
      </section>

      {overview && status && (
        <section className="flex flex-col" aria-labelledby="mail-settings">
          <h3 id="mail-settings" className="m-0 pb-1" style={typeStyle("label", "navy")}>
            Settings
          </h3>
          <dl className="m-0">
            <Row
              label="Allowed recipients"
              value={
                status.allowlistCount === 1 ? "1 address" : `${status.allowlistCount} addresses`
              }
            />
            <Row label="Demo redirect" value={status.redirectTo ?? "Off"} />
            <Row label="Send limit" value={`${status.maxPerHour} per hour`} />
            <Row
              label="Daily digest"
              value={`${overview.digest.time}, ${overview.digest.timezone}${overview.digest.hasRecipient ? "" : ", no recipient set"}`}
            />
            <Row label="Inbox tag" value={overview.inboxTag} />
          </dl>
          <p className="m-0 pt-1" style={typeStyle("small")}>
            To change these, edit .env and restart pnpm dev.
          </p>
        </section>
      )}
    </div>
  );
}
