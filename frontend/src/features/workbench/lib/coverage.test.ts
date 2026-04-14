import { describe, expect, test } from "vitest";

import {
  buildCoveragePolygon,
  coverageBlockedByWalls,
  type CoverageCamera
} from "./coverage";

const wall = {
  id: "wall-1",
  start: { x: 60, y: 0 },
  end: { x: 60, y: 120 }
};

const door = {
  id: "door-1",
  start: { x: 60, y: 45 },
  end: { x: 60, y: 75 }
};

describe("coverage geometry", () => {
  test("builds a directional coverage polygon that can pass through a door opening", () => {
    const camera: CoverageCamera = {
      id: "camera-1",
      mode: "directional",
      position: { x: 20, y: 60 },
      radius: 90,
      directionDeg: 0
    };

    const polygon = buildCoveragePolygon(camera, [wall], [door]);

    expect(polygon.length).toBeGreaterThan(3);
    expect(polygon.some((point) => point.x > 60)).toBe(true);
  });

  test("detects when wall geometry blocks a coverage ray", () => {
    const blocked = coverageBlockedByWalls(
      { x: 20, y: 20 },
      { x: 100, y: 20 },
      [wall],
      [door]
    );
    const allowed = coverageBlockedByWalls(
      { x: 20, y: 60 },
      { x: 100, y: 60 },
      [wall],
      [door]
    );

    expect(blocked).toBe(true);
    expect(allowed).toBe(false);
  });
});
