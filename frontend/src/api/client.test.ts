import { afterEach, expect, test, vi } from "vitest";

import {
  createProject,
  exportProjectBundle,
  getProject,
  importDwgPlan,
  parseProjectDto,
  recognizePlan
} from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("getProject fetches persisted project data", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "project-123",
        name: "demo-plan",
        scale: { unitsPerMeter: 42, pixelsPerMeter: 42, source: "manual" },
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
  expect(project.scale?.unitsPerMeter).toBe(42);
  expect(project.scale?.pixelsPerMeter).toBe(42);
});

test("createProject posts project payload and parses persisted response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "project-456",
        name: "demo-plan",
        scale: { unitsPerMeter: 42, pixelsPerMeter: 42, source: "manual" },
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
    scale: { unitsPerMeter: 42, pixelsPerMeter: 42, source: "manual" },
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
        scale: { unitsPerMeter: 42, pixelsPerMeter: 42, source: "manual" },
        cameras: [],
        walls: [],
        doors: []
    })
  });
  expect(project.id).toBe("project-456");
  expect(project.scale?.unitsPerMeter).toBe(42);
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
        scale: { unitsPerMeter: 42, pixelsPerMeter: 42, source: "manual" },
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
        scale: { unitsPerMeter: 40, pixelsPerMeter: 40, source: "auto" },
        walls: [
          {
            id: null,
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
  expect(result.walls[0].id).toBeUndefined();
  expect(result.confidenceItems).toHaveLength(1);
});

test("importDwgPlan posts the DWG upload and parses imported geometry", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        units_per_meter: 1000,
        unit_source: "header:insunits=4",
        viewport: {
          min_x: 0,
          min_y: 0,
          max_x: 4000,
          max_y: 3000,
          width: 4000,
          height: 3000
        },
        walls: [
          {
            id: "wall-1",
            kind: "wall",
            source_type: "LINE",
            layer: "A-WALL",
            start: { x: 0, y: 0 },
            end: { x: 4000, y: 0 }
          }
        ],
        doors: [
          {
            id: "door-1",
            kind: "door",
            source_type: "LINE",
            layer: "A-DOOR",
            start: { x: 1600, y: 0 },
            end: { x: 2500, y: 0 }
          }
        ],
        warnings: [
          {
            id: "unsupported-entity-1",
            message: "暂不支持的实体类型 TEXT，已跳过。",
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

  const result = await importDwgPlan(new File(["dwg"], "simple_room.dwg", { type: "application/acad" }));

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/dwg/import",
    expect.objectContaining({
      method: "POST",
      body: expect.any(FormData)
    })
  );
  expect(result.unitsPerMeter).toBe(1000);
  expect(result.unitSource).toBe("header:insunits=4");
  expect(result.viewport.width).toBe(4000);
  expect(result.walls).toHaveLength(1);
  expect(result.doors).toHaveLength(1);
  expect(result.warnings).toHaveLength(1);
});

test("parseProjectDto accepts migrated and legacy scale payloads", async () => {
  const migrated = parseProjectDto({
    id: "project-789",
    name: "demo-plan",
    scale: { unitsPerMeter: 1000, source: "dwg-header" },
    cameras: [],
    walls: [],
    doors: []
  });

  const legacy = parseProjectDto({
    id: "project-790",
    name: "legacy-plan",
    scale: { pixelsPerMeter: 42, source: "manual" },
    cameras: [],
    walls: [],
    doors: []
  });

  expect(migrated.scale?.unitsPerMeter).toBe(1000);
  expect(migrated.scale?.pixelsPerMeter).toBe(1000);
  expect(legacy.scale?.unitsPerMeter).toBe(42);
  expect(legacy.scale?.pixelsPerMeter).toBe(42);
});
