import { projectReducer } from "./projectReducer";

test("stores manual calibration and wall edits", () => {
  const state = projectReducer(undefined, {
    type: "project/calibrationSet",
    payload: { unitsPerMeter: 50, pixelsPerMeter: 50, source: "manual" }
  });

  const withWall = projectReducer(state, {
    type: "project/wallAdded",
    payload: { id: "wall-1", start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }
  });

  expect(withWall.scale?.unitsPerMeter).toBe(50);
  expect(withWall.scale?.pixelsPerMeter).toBe(50);
  expect(withWall.walls).toHaveLength(1);
});

test("stores imported dwg geometry and keeps it when clearing the region", () => {
  const imported = projectReducer(
    projectReducer(undefined, {
      type: "project/uploadSet",
      payload: { kind: "dwg", name: "simple_room.dwg" }
    }),
    {
      type: "project/importSucceeded",
      payload: {
        unitsPerMeter: 1000,
        unitSource: "header:insunits=4",
        viewport: {
          minX: 0,
          minY: 0,
          maxX: 4000,
          maxY: 3000,
          width: 4000,
          height: 3000
        },
        walls: [{ id: "wall-1", start: { x: 0, y: 0 }, end: { x: 4000, y: 0 } }],
        doors: [{ id: "door-1", start: { x: 1600, y: 0 }, end: { x: 2500, y: 0 } }],
        warnings: [{ id: "warning-1", message: "demo", severity: "warning" }]
      }
    }
  );

  const cleared = projectReducer(imported, {
    type: "project/regionCleared"
  });

  expect(imported.importStatus).toBe("ready");
  expect(imported.drawingViewport?.width).toBe(4000);
  expect(imported.importWarnings).toHaveLength(1);
  expect(cleared.walls).toHaveLength(1);
  expect(cleared.doors).toHaveLength(1);
  expect(cleared.drawingViewport?.width).toBe(4000);
});

test("clears draft point when selection changes", () => {
  const withDraft = projectReducer(undefined, {
    type: "project/draftPointSet",
    payload: { x: 12, y: 34 }
  });

  const withSelection = projectReducer(withDraft, {
    type: "project/selectedSet",
    payload: { type: "camera", id: "camera-1" }
  });

  expect(withSelection.draftPoint).toBeNull();
  expect(withSelection.selected).toEqual({ type: "camera", id: "camera-1" });
});
