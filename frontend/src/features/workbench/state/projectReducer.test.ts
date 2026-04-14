import { projectReducer } from "./projectReducer";

test("stores manual calibration and wall edits", () => {
  const state = projectReducer(undefined, {
    type: "project/calibrationSet",
    payload: { pixelsPerMeter: 50, source: "manual" }
  });

  const withWall = projectReducer(state, {
    type: "project/wallAdded",
    payload: { id: "wall-1", start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }
  });

  expect(withWall.scale?.pixelsPerMeter).toBe(50);
  expect(withWall.walls).toHaveLength(1);
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
