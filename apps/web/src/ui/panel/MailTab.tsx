import {
  composeEmail,
  emailAsText,
  type MailOverview,
  type MailStatus,
  mailtoUrl,
  type QueueItem,
} from "@hq/shared";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";

const BUTTON =
  "inline-flex items-center rounded-button border border-hairline bg-white px-2.5 py-1 no-underline hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";
const PRIMARY =
  "inline-flex items-center rounded-button border border-accent bg-accent px-2.5 py-1 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";
const buttonText = { ...typeStyle("small", "navy"), fontWeight: 700 };
const primaryText = { ...typeStyle("small", "white"), fontWeight: 700 };

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

const clockOf = (iso: string) => iso.slice(11, 16);
/** The vault can be edited by hand, so only Outlook's own web addresses become a link. */
const OUTLOOK_LINK = /^https:\/\/outlook\.(live|office|office365)\.com\//;

/** A sign-in problem sent back by /auth/callback, read once and taken out of the address bar. */
function takeMailProblem(): string | null {
  const url = new URL(window.location.href);
  const problem = url.searchParams.get("mailProblem");
  if (!problem) return null;
  url.searchParams.delete("mailProblem");
  window.history.replaceState(null, "", url);
  return problem;
}

async function post<T>(path: string, body: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the local server.");
  }
  const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(json?.error ?? "The server could not do that.");
  return json as T;
}

/**
 * GET /api/mail. Again when Demo Day starts or stops (it changes the driver), when a draft or a
 * send changes, and after Sign out.
 */
function useMailOverview(
  queue: QueueItem[],
): [MailOverview | null, (o: MailOverview | null) => void] {
  const demoOn = useStore((s) => Boolean(s.data?.demo));
  const mailKey = queue.map((q) => (q.mail ? `${q.id}:${q.mail.state}` : "")).join(",");
  const [overview, setOverview] = useState<MailOverview | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: demoOn and mailKey are the triggers
  useEffect(() => {
    let live = true;
    fetch("/api/mail")
      .then((r) => (r.ok ? (r.json() as Promise<MailOverview>) : null))
      .then((o) => live && setOverview(o))
      .catch(() => live && setOverview(null));
    return () => {
      live = false;
    };
  }, [demoOn, mailKey]);
  return [overview, setOverview];
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

type Check = { ok: true; to: string[]; redirectedFrom?: string[] } | { ok: false; error: string };

/**
 * Send now, with a confirm step that lists the real recipients, read again from Outlook by the
 * server. The server checks every rule again when you confirm.
 */
function SendNow({ item, paused }: { item: QueueItem; paused: boolean }) {
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const id = encodeURIComponent(item.id);

  const open = () => {
    setSaid("");
    setBusy(true);
    fetch(`/api/mail/items/${id}/send-check`)
      .then((r) => r.json() as Promise<Check>)
      .then((c) => {
        setCheck(c);
        if (c.ok) requestAnimationFrame(() => confirmRef.current?.focus());
      })
      .catch(() => setCheck({ ok: false, error: "Could not reach the local server." }))
      .finally(() => setBusy(false));
  };
  const confirm = () => {
    if (!check?.ok) return;
    setBusy(true);
    post(`/api/mail/items/${id}/send`, { recipients: check.to })
      .then(() => {
        setCheck(null);
        setSaid("Sent.");
      })
      .catch((e: unknown) => {
        setCheck(null);
        setSaid(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      {!check && (
        <button
          type="button"
          disabled={paused || busy}
          onClick={open}
          className={PRIMARY}
          style={primaryText}
        >
          Send now
        </button>
      )}
      {check && !check.ok && (
        <span role="alert" className="basis-full" style={typeStyle("small", "ink")}>
          {check.error}
        </span>
      )}
      {check?.ok && (
        <div
          role="alertdialog"
          aria-labelledby={`send-${item.id}`}
          className="flex basis-full flex-col gap-1.5 rounded-button border border-accent p-2"
          data-testid="send-confirm"
        >
          <span id={`send-${item.id}`} style={typeStyle("tagName")}>
            Send this email now to:
          </span>
          <ul className="m-0 pl-4" style={typeStyle("small", "ink")}>
            {check.to.map((to) => (
              <li key={to}>{to}</li>
            ))}
          </ul>
          {check.redirectedFrom && (
            <span style={typeStyle("small")}>
              Demo redirect. Originally to: {check.redirectedFrom.join(", ")}.
            </span>
          )}
          <div className="flex gap-1.5">
            <button
              ref={confirmRef}
              type="button"
              disabled={busy}
              onClick={confirm}
              className={PRIMARY}
              style={primaryText}
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setCheck(null)}
              className={BUTTON}
              style={buttonText}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <span aria-live="polite" className="basis-full" style={typeStyle("small", "ink")}>
        {said}
      </span>
    </>
  );
}

/** One approved email: who it goes to, and the ways to send it. */
function DraftRow({
  item,
  paused,
  sendReady,
}: {
  item: QueueItem;
  paused: boolean;
  sendReady: boolean;
}) {
  const [said, setSaid] = useState("");
  const email = composeEmail(item);
  const mail = item.mail;
  if (!mail) return null;
  const mailto = email && mail.driver !== "graph" ? mailtoUrl(email) : null;

  const copy = () => {
    if (!email) return;
    navigator.clipboard
      .writeText(emailAsText(email))
      .then(() => setSaid("Email copied. Paste it into a new email in Outlook."))
      .catch(() => setSaid("Could not copy. Use Download .eml instead."));
  };
  const redraft = () => {
    setSaid("");
    post(`/api/mail/items/${encodeURIComponent(item.id)}/draft`, {}).catch((e: unknown) =>
      setSaid(e instanceof Error ? e.message : String(e)),
    );
  };

  return (
    <li className="flex flex-col gap-1.5 border-t border-hairline py-3" data-testid="mail-draft">
      <span style={typeStyle("tagName")}>{email?.subject ?? item.title}</span>
      <span style={typeStyle("small")}>
        To {mail.to.join(", ") || "nobody yet"}
        {mail.redirectedFrom
          ? ` (demo redirect, originally ${mail.redirectedFrom.join(", ")})`
          : ""}
        .{" "}
        {mail.state === "draft" &&
          (mail.driver === "graph"
            ? "Draft ready in your Outlook Drafts. Nothing was sent."
            : "Draft ready. Nothing was sent.")}
        {mail.state === "dry-run" && "Dry run, no draft was made."}
        {mail.state === "sent" && `Sent at ${clockOf(mail.sentAt ?? "")}.`}
        {mail.state === "failed" && `Not made: ${mail.problem ?? "something went wrong."}`}
      </span>
      {email && mail.state === "draft" && mail.driver === "graph" && (
        <div className="flex flex-wrap gap-1.5">
          {mail.webLink && OUTLOOK_LINK.test(mail.webLink) && (
            <a
              href={mail.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className={BUTTON}
              style={buttonText}
            >
              Open draft in Outlook
            </a>
          )}
          {sendReady && <SendNow item={item} paused={paused} />}
        </div>
      )}
      {email && mail.state !== "failed" && mail.driver !== "graph" && (
        <div className="flex flex-wrap gap-1.5">
          {mailto && (
            <a href={mailto.url} className={BUTTON} style={buttonText}>
              Open in Outlook
            </a>
          )}
          <button type="button" onClick={copy} className={BUTTON} style={buttonText}>
            Copy email
          </button>
          <a
            href={`/api/mail/items/${encodeURIComponent(item.id)}/eml`}
            download={`${item.id}.eml`}
            data-testid="download-eml"
            className={BUTTON}
            style={buttonText}
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
          style={buttonText}
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
 * The Mail tab (D-117): how email leaves the app, the Outlook sign-in, the drafts your approvals
 * made, the sent log, and the mail settings from .env (read-only). Approve makes a draft.
 * Sending is always a separate, human step.
 */
export function MailTab({ queue, paused }: { queue: QueueItem[]; paused: boolean }) {
  const [overview, setOverview] = useMailOverview(queue);
  const [signInProblem] = useState(takeMailProblem);
  const [said, setSaid] = useState("");
  const status = overview?.status;
  const drafts = queue
    .filter((q) => q.mail)
    .sort((a, b) => (b.mail?.createdAt ?? "").localeCompare(a.mail?.createdAt ?? ""));
  const canConnect = status?.configured === "graph" && status.driver === "graph";

  const signOut = () => {
    setSaid("");
    post<MailOverview>("/api/mail/signout", {})
      .then((o) => {
        setOverview(o);
        setSaid("Signed out of Outlook.");
      })
      .catch((e: unknown) => setSaid(e instanceof Error ? e.message : String(e)));
  };

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
        {canConnect && (
          <div className="flex items-center gap-2 border-t border-hairline py-2">
            {status?.connected ? (
              <button
                type="button"
                onClick={signOut}
                disabled={paused}
                className={BUTTON}
                style={buttonText}
              >
                Sign out
              </button>
            ) : (
              <a
                href="/auth/login"
                className={PRIMARY}
                style={primaryText}
                data-testid="connect-outlook"
              >
                Connect Outlook
              </a>
            )}
          </div>
        )}
        {[signInProblem, status?.problem, status?.cacheWarning, said]
          .filter((m): m is string => Boolean(m))
          .map((message) => (
            <p
              key={message}
              className="m-0 pt-1"
              role="note"
              data-testid="mail-problem"
              style={typeStyle("small", "ink")}
            >
              {message}
            </p>
          ))}
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
              <DraftRow
                key={item.id}
                item={item}
                paused={paused}
                sendReady={Boolean(status?.sendReady)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col" aria-labelledby="mail-sent">
        <h3 id="mail-sent" className="m-0 pb-1" style={typeStyle("label", "navy")}>
          Sent
        </h3>
        {overview?.sent.length ? (
          <ul className="m-0 list-none p-0" data-testid="mail-sent">
            {overview.sent.map((s) => (
              <li
                key={`${s.itemId}-${s.at}`}
                className="border-t border-hairline py-2"
                style={typeStyle("small", "ink")}
              >
                {clockOf(s.at)}, {s.subject}, to {s.to.join(", ")}
                {s.redirectedFrom ? ` (redirected from ${s.redirectedFrom.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0" style={typeStyle("small")}>
            Nothing sent from the app yet.
          </p>
        )}
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
