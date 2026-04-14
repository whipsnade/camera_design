import { afterEach, expect, test, vi } from "vitest";

import { createProject, exportProjectBundle, getProject, recognizePlan } from "./client";

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

test("createProject posts project payload and parses persisted response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "project-456",
        name: "demo-plan",
        scale: { pixelsPerMeter: 42, source: "manual" },
        cameras: [],
        walls: [],
        doors: []
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    )
  );

  vi.stubGlobal("fetch", fetchMock);

  const project = await createProject({
    id: "../escape",
    name: "demo-plan",
    scale: { pixelsPerMeter: 42, source: "manual" },
    cameras: [],
    walls: [],
    doors: []
  } as unknown as Parameters<typeof createProject>[0]);

  expect(fetchMock).toHaveBeenCalledWith("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "demo-plan",
      scale: { pixelsPerMeter: 42, source: "manual" },
      cameras: [],
      walls: [],
      doors: []
    })
  });
  expect(project.id).toBe("project-456");
  expect(project.scale?.pixelsPerMeter).toBe(42);
});

test("exportProjectBundle posts project data and png content", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        project_path: "/tmp/demo/project.camera-plan.json",
        png_path: "/tmp/demo/annotated-plan.png",
        pdf_path: "/tmp/demo/annotated-plan.pdf"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  );

  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("btoa", (value: string) => value);

  const bundle = await exportProjectBundle({
    projectId: "project-456",
    metadataJson: JSON.stringify({
      id: "project-456",
      name: "demo-plan",
      scale: { pixelsPerMeter: 42, source: "manual" },
      cameras: [],
      walls: [],
      doors: []
    }),
    annotatedPngBlob: new Blob(["png"], { type: "image/png" })
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/projects/project-456/export",
    expect.objectContaining({
      method: "POST",
      body: expect.any(FormData)
    })
  );
  expect(bundle.projectPath).toContain("project.camera-plan.json");
  expect(bundle.pngPath).toContain(".png");
  expect(bundle.pdfPath).toContain(".pdf");
});

test("recognizePlan posts the uploaded drawing and parses suggestions", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        scale: { pixelsPerMeter: 40, source: "auto" },
        walls: [
          {
            start: { x: 20, y: 20 },
            end: { x: 220, y: 20 }
          }
        ],
        doors: [
          {
            start: { x: 90, y: 20 },
            end: { x: 150, y: 20 }
          }
        ],
        confidence_items: [
          {
            id: "structure-review",
            message: "请确认自动识别的墙体和门洞位置。",
            severity: "warning"
          }
        ]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  );

  vi.stubGlobal("fetch", fetchMock);

  const result = await recognizePlan(new File(["plan"], "floor.png", { type: "image/png" }));

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/recognition/plan",
    expect.objectContaining({
      method: "POST",
      body: expect.any(FormData)
    })
  );
  expect(result.scale?.source).toBe("auto");
  expect(result.walls).toHaveLength(1);
  expect(result.confidenceItems).toHaveLength(1);
});
