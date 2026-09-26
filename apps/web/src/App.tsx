import { lazy, Suspense, useEffect } from "react";
import { connectToServer } from "./state/connection";
import { OfficeScreen } from "./ui/OfficeScreen";

const LabPage = lazy(() => import("./lab/LabPage").then((m) => ({ default: m.LabPage })));
const DioramaPage = lazy(() =>
  import("./lab/diorama/DioramaPage").then((m) => ({ default: m.DioramaPage })),
);

/** Three routes for now: the office "/", the design Lab "/lab" and its 3D study "/lab/diorama". */
export function App() {
  useEffect(() => connectToServer(), []);

  if (window.location.pathname.startsWith("/lab/diorama")) {
    return (
      <Suspense fallback={null}>
        <DioramaPage />
      </Suspense>
    );
  }
  if (window.location.pathname.startsWith("/lab")) {
    return (
      <Suspense fallback={null}>
        <LabPage />
      </Suspense>
    );
  }
  return <OfficeScreen />;
}
