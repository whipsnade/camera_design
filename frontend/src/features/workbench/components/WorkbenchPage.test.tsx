import { render, screen } from "@testing-library/react";

import { WorkbenchPage } from "./WorkbenchPage";

test("renders upload, canvas, and coverage controls", () => {
  render(<WorkbenchPage />);

  expect(screen.getByText("上传图纸")).toBeInTheDocument();
  expect(screen.getByText("图纸画布")).toBeInTheDocument();
  expect(screen.getByText("覆盖距离")).toBeInTheDocument();
});
