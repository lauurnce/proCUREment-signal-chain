import { lazy, Suspense, useEffect } from "react";
import { connectToServer } from "./state/connection";
import { OfficeScreen } from "./ui/OfficeScreen";

const LabPage = lazy(() => import("./lab/LabPage").then((m) => ({ default: m.LabPage })));

/** Two routes for now: "/" is the office and "/lab" is the design Lab. No router needed yet. */
export function App() {
  useEffect(() => connectToServer(), []);

  if (window.location.pathname.startsWith("/lab")) {
    return (
      <Suspense fallback={null}>
        <LabPage />
      </Suspense>
    );
  }
  return <OfficeScreen />;
}
