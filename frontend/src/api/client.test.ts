import { afterEach, expect, test, vi } from "vitest";

import { getProject } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("getProject fetches persisted project data", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "project-123",
        name: "demo-plan",
        scale: { pixelsPerMeter: 42, source: "manual" },
        cameras: [],
        walls: [],
        doors: []
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  );

  vi.stubGlobal("fetch", fetchMock);

  const project = await getProject("project-123");

  expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-123", {
    method: "GET"
  });
  expect(project.name).toBe("demo-plan");
  expect(project.scale?.pixelsPerMeter).toBe(42);
});
