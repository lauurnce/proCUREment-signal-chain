import { Scene } from "../scene/Scene";
import { AboutNote } from "./AboutNote";
import { HealthBadge } from "./HealthBadge";

/** The main screen: the full-screen office with a few floating labels. */
export function OfficeScreen() {
  return (
    <main className="relative h-full w-full overflow-hidden">
      <Scene />
      <header className="pointer-events-none absolute top-4 left-4">
        <h1 className="m-0 font-sans text-[20px] leading-[28px] font-bold text-navy">
          SignalChain HQ
        </h1>
      </header>
      <footer className="pointer-events-none absolute right-4 bottom-4 left-4 flex items-end justify-between">
        <AboutNote />
        {import.meta.env.DEV && <HealthBadge />}
      </footer>
    </main>
  );
}
