import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../lib/exportPlan", () => ({
  exportPlanImage: vi.fn(() => Promise.resolve(new Blob(["png"], { type: "image/png" })))
}));

import { WorkbenchPage } from "./WorkbenchPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function confirmRegionPolygon() {
  const canvas = screen.getByLabelText("plan canvas");

  fireEvent.click(canvas, { clientX: 40, clientY: 40 });
  fireEvent.click(canvas, { clientX: 220, clientY: 40 });
  fireEvent.click(canvas, { clientX: 220, clientY: 180 });
  fireEvent.click(screen.getByRole("button", { name: "确认区域" }));
}

test("renders exactly three ordered workbench regions", () => {
  render(<WorkbenchPage />);

  const layout = screen.getByLabelText("workbench layout");
  const regions = Array.from(layout.children);

  expect(layout.tagName).toBe("MAIN");
  expect(regions).toHaveLength(3);
  expect(regions[0].textContent).toContain("导入 DWG");
  expect(regions[1].textContent).toContain("DWG 画布");
  expect(regions[2].textContent).toContain("覆盖距离");
});

test("uploads a dwg file and renders imported geometry", async () => {
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
            start: { x: 0, y: 0 },
            end: { x: 4000, y: 0 }
          },
          {
            id: "wall-2",
            start: { x: 4000, y: 0 },
            end: { x: 4000, y: 3000 }
          }
        ],
        doors: [
          {
            id: "door-1",
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

  const { container } = render(<WorkbenchPage />);
  const input = screen.getByLabelText("上传DWG文件");
  const file = new File(["demo"], "simple_room.dwg", { type: "application/acad" });

  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => {
    expect(screen.getByLabelText("导入状态")).toHaveValue("已导入");
  });
  expect(screen.getByLabelText("当前DWG文件")).toHaveValue("simple_room.dwg");
  expect(await screen.findByLabelText("当前标定")).toHaveValue("1000");
  expect(container.querySelectorAll("[data-segment-id]").length).toBeGreaterThan(0);
});

test("shows cad unit calibration and import warnings after dwg import", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        units_per_meter: 40,
        unit_source: "header:insunits=4",
        viewport: {
          min_x: 0,
          min_y: 0,
          max_x: 240,
          max_y: 160,
          width: 240,
          height: 160
        },
        walls: [
          {
            id: "wall-1",
            start: { x: 20, y: 20 },
            end: { x: 20, y: 160 }
          },
          {
            id: "wall-2",
            start: { x: 220, y: 20 },
            end: { x: 220, y: 160 }
          },
          {
            id: "wall-3",
            start: { x: 20, y: 160 },
            end: { x: 220, y: 160 }
          },
          {
            id: "wall-4",
            start: { x: 20, y: 20 },
            end: { x: 90, y: 20 }
          }
        ],
        doors: [
          {
            id: "door-1",
            start: { x: 90, y: 20 },
            end: { x: 150, y: 20 }
          }
        ],
        warnings: [
          {
            id: "structure-review",
            message: "请确认导入的墙体和门洞位置。",
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

  render(<WorkbenchPage />);
  const input = screen.getByLabelText("上传DWG文件");
  const file = new File(["demo"], "floor.dwg", { type: "application/acad" });

  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => {
    expect(screen.getByLabelText("导入状态")).toHaveValue("已导入");
  });
  expect(screen.getByLabelText("当前标定")).toHaveValue("40");
  expect(screen.getByLabelText("导入警告数量")).toHaveValue("1");
  expect(screen.getByLabelText("墙体数量")).toHaveValue("4");
  expect(screen.getByLabelText("门洞数量")).toHaveValue("1");
});

test("surfaces the backend import error when dwgread is missing", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ detail: "dwgread is not installed" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    })
  );

  vi.stubGlobal("fetch", fetchMock);

  render(<WorkbenchPage />);

  fireEvent.change(screen.getByLabelText("上传DWG文件"), {
    target: { files: [new File(["dwg"], "simple_room.dwg", { type: "application/acad" })] }
  });

  await waitFor(() => {
    expect(screen.getByLabelText("导入状态")).toHaveValue("导入失败：dwgread is not installed");
  });
});

test("keeps camera ids unique after delete and re-add", () => {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:floor-plan"),
    revokeObjectURL: vi.fn()
  });

  const { container } = render(<WorkbenchPage />);
  const canvas = screen.getByLabelText("plan canvas");
  const cameraMode = screen.getByLabelText("相机模式");
  const deleteButton = screen.getByLabelText("删除选中元素");

  fireEvent.click(cameraMode);
  fireEvent.click(canvas, { clientX: 40, clientY: 40 });
  fireEvent.click(canvas, { clientX: 80, clientY: 80 });
  fireEvent.click(canvas, { clientX: 120, clientY: 120 });

  const initialIds = Array.from(container.querySelectorAll("[data-camera-id]")).map((node) =>
    node.getAttribute("data-camera-id")
  );

  expect(new Set(initialIds).size).toBe(initialIds.length);

  const cameraNodes = container.querySelectorAll("[data-camera-id]");
  fireEvent.click(cameraNodes[1]);
  fireEvent.click(deleteButton);
  fireEvent.click(canvas, { clientX: 160, clientY: 160 });

  const nextIds = Array.from(container.querySelectorAll("[data-camera-id]")).map((node) =>
    node.getAttribute("data-camera-id")
  );

  expect(new Set(nextIds).size).toBe(nextIds.length);
});

test("recalculates layout when coverage distance changes and renders solver results", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          units_per_meter: 40,
          unit_source: "header:insunits=4",
          viewport: {
            min_x: 0,
            min_y: 0,
            max_x: 240,
            max_y: 160,
            width: 240,
            height: 160
          },
          walls: [
            { id: "wall-1", start: { x: 20, y: 20 }, end: { x: 20, y: 160 } },
            { id: "wall-2", start: { x: 220, y: 20 }, end: { x: 220, y: 160 } }
          ],
          doors: [{ id: "door-1", start: { x: 90, y: 20 }, end: { x: 150, y: 20 } }],
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          recommended_camera_count: 2,
          coverage_ratio: 0.875,
          blind_spots: [{ x: 24, y: 48 }],
          overlap_hints: [{ x: 180, y: 120 }],
          cameras: [
            {
              id: "CAM-01",
              mode: "directional",
              position: { x: 80, y: 100 },
              direction_deg: 0,
              coverage_polygon: [
                { x: 80, y: 100 },
                { x: 150, y: 70 },
                { x: 180, y: 100 },
                { x: 150, y: 130 }
              ]
            },
            {
              id: "CAM-02",
              mode: "panoramic",
              position: { x: 220, y: 160 },
              direction_deg: null,
              coverage_polygon: [
                { x: 220, y: 80 },
                { x: 280, y: 120 },
                { x: 280, y: 200 },
                { x: 220, y: 240 }
              ]
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

  render(<WorkbenchPage />);

  fireEvent.change(screen.getByLabelText("上传DWG文件"), {
    target: { files: [new File(["dwg"], "simple_room.dwg", { type: "application/acad" })] }
  });

  await waitFor(() => {
    expect(screen.getByLabelText("导入状态")).toHaveValue("已导入");
  });

  fireEvent.change(screen.getByLabelText("手工标定图纸单位每米"), {
    target: { value: "30" }
  });
  confirmRegionPolygon();
  fireEvent.change(screen.getByLabelText("覆盖距离滑块"), {
    target: { value: "10" }
  });
  fireEvent.click(screen.getByRole("button", { name: "重新计算" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/layout/solve",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  expect(screen.getByLabelText("建议摄像头数量")).toHaveValue("2");
  expect(screen.getByLabelText("覆盖率")).toHaveValue("87.5%");
  expect(document.querySelectorAll("[data-coverage-camera-id]")).toHaveLength(2);
});

test("keeps a locked camera position when recalculating layout", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          units_per_meter: 40,
          unit_source: "header:insunits=4",
          viewport: {
            min_x: 0,
            min_y: 0,
            max_x: 240,
            max_y: 160,
            width: 240,
            height: 160
          },
          walls: [
            { id: "wall-1", start: { x: 20, y: 20 }, end: { x: 20, y: 160 } },
            { id: "wall-2", start: { x: 220, y: 20 }, end: { x: 220, y: 160 } }
          ],
          doors: [{ id: "door-1", start: { x: 90, y: 20 }, end: { x: 150, y: 20 } }],
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          recommended_camera_count: 2,
          coverage_ratio: 0.82,
          blind_spots: [],
          overlap_hints: [],
          cameras: [
            {
              id: "CAM-01",
              mode: "directional",
              position: { x: 80, y: 100 },
              direction_deg: 0,
              coverage_polygon: [
                { x: 80, y: 100 },
                { x: 150, y: 70 },
                { x: 180, y: 100 }
              ]
            },
            {
              id: "CAM-02",
              mode: "panoramic",
              position: { x: 220, y: 160 },
              direction_deg: null,
              coverage_polygon: [
                { x: 220, y: 90 },
                { x: 290, y: 160 },
                { x: 220, y: 230 }
              ]
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          recommended_camera_count: 2,
          coverage_ratio: 0.9,
          blind_spots: [],
          overlap_hints: [],
          cameras: [
            {
              id: "CAM-01",
              mode: "directional",
              position: { x: 320, y: 240 },
              direction_deg: 0,
              coverage_polygon: [
                { x: 320, y: 240 },
                { x: 390, y: 200 },
                { x: 400, y: 240 }
              ]
            },
            {
              id: "CAM-02",
              mode: "panoramic",
              position: { x: 360, y: 260 },
              direction_deg: null,
              coverage_polygon: [
                { x: 360, y: 200 },
                { x: 420, y: 260 },
                { x: 360, y: 320 }
              ]
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

  const { container } = render(<WorkbenchPage />);

  fireEvent.change(screen.getByLabelText("上传DWG文件"), {
    target: { files: [new File(["dwg"], "simple_room.dwg", { type: "application/acad" })] }
  });

  await waitFor(() => {
    expect(screen.getByLabelText("导入状态")).toHaveValue("已导入");
  });

  fireEvent.change(screen.getByLabelText("手工标定图纸单位每米"), {
    target: { value: "30" }
  });
  confirmRegionPolygon();
  fireEvent.click(screen.getByRole("button", { name: "重新计算" }));

  await waitFor(() => {
    expect(screen.getByLabelText("建议摄像头数量")).toHaveValue("2");
  });

  fireEvent.click(container.querySelector('[data-camera-id="CAM-01"]') as Element);
  fireEvent.click(screen.getByRole("button", { name: "锁定当前相机" }));
  fireEvent.click(screen.getByRole("button", { name: "重新计算" }));

  const lockedCamera = container.querySelector('[data-camera-id="CAM-01"]');
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  expect(lockedCamera?.getAttribute("cx")).toBe("80");
  expect(lockedCamera?.getAttribute("cy")).toBe("100");
});

test("exports the current plan bundle and shows generated paths", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          units_per_meter: 40,
          unit_source: "header:insunits=4",
          viewport: {
            min_x: 0,
            min_y: 0,
            max_x: 240,
            max_y: 160,
            width: 240,
            height: 160
          },
          walls: [
            { id: "wall-1", start: { x: 20, y: 20 }, end: { x: 20, y: 160 } },
            { id: "wall-2", start: { x: 220, y: 20 }, end: { x: 220, y: 160 } }
          ],
          doors: [{ id: "door-1", start: { x: 90, y: 20 }, end: { x: 150, y: 20 } }],
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    )
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          project_path: "/tmp/demo-project/project.camera-plan.json",
          png_path: "/tmp/demo-project/annotated-plan.png",
          pdf_path: "/tmp/demo-project/annotated-plan.pdf"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

  vi.stubGlobal("fetch", fetchMock);

  render(<WorkbenchPage />);

  fireEvent.change(screen.getByLabelText("上传DWG文件"), {
    target: { files: [new File(["dwg"], "simple_room.dwg", { type: "application/acad" })] }
  });

  await waitFor(() => {
    expect(screen.getByLabelText("导入状态")).toHaveValue("已导入");
  });

  fireEvent.click(screen.getByRole("button", { name: "导出成果" }));

  expect(await screen.findByLabelText("导出PDF路径")).toHaveValue(
    "/tmp/demo-project/annotated-plan.pdf"
  );
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/projects\/.+\/export$/),
    expect.objectContaining({
      method: "POST",
      body: expect.any(FormData)
    })
  );
});
