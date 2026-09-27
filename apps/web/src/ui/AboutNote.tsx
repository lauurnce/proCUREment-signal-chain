/**
 * Always visible so nobody mistakes this for an official product.
 * `onDark` switches to light blue text for the navy night backdrop, so it stays readable.
 */
export function AboutNote({ onDark = false }: { onDark?: boolean }) {
  return (
    <p
      data-testid="about-note"
      className={`m-0 font-sans text-[13px] leading-[18px] transition-colors duration-[1200ms] ${onDark ? "text-blue-light" : "text-ink-muted"}`}
    >
      Unofficial prototype · Fictional data
    </p>
  );
}
