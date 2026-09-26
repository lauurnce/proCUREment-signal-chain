import { lazy, Suspense, useEffect } from "react";
import { connectToServer } from "./state/connection";
import { OfficeScreen } from "./ui/OfficeScreen";

const LabPage = lazy(() => import("./lab/LabPage").then((m) => ({ default: m.LabPage })));
const FloorPlanPage = lazy(() =>
  import("./lab/floorplan/FloorPlanPage").then((m) => ({ default: m.FloorPlanPage })),
);
const PanelLabPage = lazy(() =>
  import("./lab/panel/PanelLabPage").then((m) => ({ default: m.PanelLabPage })),
);
const DioramaPage = lazy(() =>
  import("./lab/diorama/DioramaPage").then((m) => ({ default: m.DioramaPage })),
);

/** Routes: the office "/", the design Lab "/lab", and its studies "/lab/diorama", "/lab/floorplan" and "/lab/panel". */
export function App() {
  useEffect(() => connectToServer(), []);

  if (window.location.pathname.startsWith("/lab/panel")) {
    return (
      <Suspense fallback={null}>
        <PanelLabPage />
      </Suspense>
    );
  }
  if (window.location.pathname.startsWith("/lab/floorplan")) {
    return (
      <Suspense fallback={null}>
        <FloorPlanPage />
      </Suspense>
    );
  }
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
