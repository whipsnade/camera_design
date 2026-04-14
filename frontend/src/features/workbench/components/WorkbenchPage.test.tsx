import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { WorkbenchPage } from "./WorkbenchPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("renders exactly three ordered workbench regions", () => {
  render(<WorkbenchPage />);

  const layout = screen.getByLabelText("workbench layout");
  const regions = Array.from(layout.children);

  expect(layout.tagName).toBe("MAIN");
  expect(regions).toHaveLength(3);
  expect(regions.map((region) => region.textContent)).toEqual([
    "上传图纸",
    "图纸画布",
    "覆盖距离"
  ]);
});

test("uploads a plan file and renders the preview", () => {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:floor-plan"),
    revokeObjectURL: vi.fn()
  });

  const { container } = render(<WorkbenchPage />);
  const input = screen.getByLabelText("上传图纸文件");
  const file = new File(["demo"], "floor.png", { type: "image/png" });

  fireEvent.change(input, { target: { files: [file] } });

  expect(screen.getByLabelText("当前图纸文件")).toHaveValue("floor.png");
  expect(screen.getByAltText("plan-preview")).toBeInTheDocument();
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
