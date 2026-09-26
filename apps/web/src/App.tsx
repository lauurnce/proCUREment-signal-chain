import { lazy, Suspense, useEffect } from "react";
import { connectToServer } from "./state/connection";
import { OfficeScreen } from "./ui/OfficeScreen";

const LabPage = lazy(() => import("./lab/LabPage").then((m) => ({ default: m.LabPage })));
const FloorPlanPage = lazy(() =>
  import("./lab/floorplan/FloorPlanPage").then((m) => ({ default: m.FloorPlanPage })),
);
const DioramaPage = lazy(() =>
  import("./lab/diorama/DioramaPage").then((m) => ({ default: m.DioramaPage })),
);

/** Routes: the office "/", the design Lab "/lab", and its studies "/lab/diorama" and "/lab/floorplan". */
export function App() {
  useEffect(() => connectToServer(), []);

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
