import { render, screen } from "@testing-library/react";

import { WorkbenchPage } from "./WorkbenchPage";

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
