// Times in the panel, in Asia/Manila (adi-theme copy rules: "25 Sep 2026", "9:20 AM").

const ZONE = "Asia/Manila";

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(d);

const clock = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" }).format(
    d,
  );

// Fixed short month names, because some locales write "Sept" and the copy rule is "Sep".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(d: Date) {
  const [y, m, day] = dayKey(d).split("-").map(Number);
  return { year: y, month: MONTHS[(m ?? 1) - 1], day };
}

/** "25 Sep 2026". */
export function dateOnly(iso: string): string {
  const p = parts(new Date(iso));
  return `${p.day} ${p.month} ${p.year}`;
}

/**
 * How long ago, in plain words (copy deck, age formats). Same day: "Just now", "20 min ago",
 * "1 hour ago", "3 hours ago". The day before: "Yesterday, 4:15 PM". Older: "23 Sep 2026".
 */
export function ago(iso: string, now: Date): string {
  const then = new Date(iso);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(then) === dayKey(yesterday)) return `Yesterday, ${clock(then)}`;
  if (dayKey(then) !== dayKey(now)) return dateOnly(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

/** "25 Sep 2026, 9:20 AM". */
export function fullTime(iso: string): string {
  const d = new Date(iso);
  const p = parts(d);
  return `${p.day} ${p.month} ${p.year}, ${clock(d)}`;
}

/** "9:32 AM", for undo messages. */
export const clockTime = (d: Date) => clock(d);
