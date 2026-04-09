# Camera Layout System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local browser-based prototype that uploads floor plans, calibrates real-world scale, computes camera count and placements with wall/door occlusion, supports manual editing, and exports annotated PNG/PDF deliverables.

**Architecture:** Split the prototype into a React/Vite frontend and a FastAPI backend. The frontend owns the canvas editor, slider controls, selection state, and export trigger; the backend owns file ingest, project persistence, OCR/structure recognition, layout solving, and PDF generation. Both sides exchange typed JSON payloads so the solver and editor can evolve independently.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, react-konva, FastAPI, Pydantic, pytest, OpenCV, Pillow, ReportLab, npm, Python 3.11+

---

## Preflight

- If `/Users/hanxiang/Works/Projects/cad/.git` does not exist, run `git init` before Task 1 so later commit steps work.
- Create `/Users/hanxiang/Works/Projects/cad/.gitignore` early with at least: `.DS_Store`, `.superpowers/`, `frontend/node_modules/`, `frontend/dist/`, `backend/.venv/`, `backend/.pytest_cache/`, `data/projects/`, `__pycache__/`.
- Keep runtime data under `/Users/hanxiang/Works/Projects/cad/data/projects/`; commit only a `.gitkeep`.
- Because this workspace is not yet a git repo, a dedicated worktree cannot be created until after `git init`.

## Planned File Structure

### Root

- Create: `/Users/hanxiang/Works/Projects/cad/.gitignore`
- Create: `/Users/hanxiang/Works/Projects/cad/data/projects/.gitkeep`
- Create: `/Users/hanxiang/Works/Projects/cad/README.md`
- Responsibility: repo hygiene, local run instructions, persistent project storage root

### Frontend

- Create: `/Users/hanxiang/Works/Projects/cad/frontend/package.json`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/tsconfig.json`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/vite.config.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/main.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/App.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/styles/global.css`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/api/client.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/api/client.test.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/types.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/state/projectReducer.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/UploadPanel.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/PlanCanvas.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ControlsPanel.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/InspectorPanel.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ResultsSummary.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/lib/coverage.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/lib/exportPlan.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.test.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/state/projectReducer.test.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/lib/coverage.test.ts`
- Responsibility: editor UI, upload flow, canvas overlays, slider-driven recalculation, client-side image export

### Backend

- Create: `/Users/hanxiang/Works/Projects/cad/backend/pyproject.toml`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/main.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/health.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/projects.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/layout.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/recognition.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/models/project.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/models/layout.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/storage.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/geometry.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/layout_solver.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/recognition.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/exporter.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_health.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_projects_api.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_layout_solver.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_recognition.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_exporter.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/fixtures/simple_floorplan.png`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/fixtures/scale_floorplan.png`
- Responsibility: APIs, persistence, calibration/recognition, occlusion-aware placement solver, PDF export

## Task 1: Bootstrap The Backend Service

**Files:**
- Create: `/Users/hanxiang/Works/Projects/cad/backend/pyproject.toml`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/main.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/health.py`
- Test: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_health.py`

- [ ] **Step 1: Write the failing backend health test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_health.py -q`

Expected: FAIL because `app.main` or `/api/health` does not exist yet.

- [ ] **Step 3: Write the minimal FastAPI app and health route**

```python
from fastapi import FastAPI

from app.api.health import router as health_router

app = FastAPI()
app.include_router(health_router, prefix="/api")
```

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: Run the test again and keep it green**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_health.py -q`

Expected: PASS

- [ ] **Step 5: Commit the backend bootstrap**

```bash
git add backend/pyproject.toml backend/app/main.py backend/app/api/health.py backend/tests/test_health.py
git commit -m "feat: bootstrap backend service"
```

## Task 2: Bootstrap The Frontend Workbench Shell

**Files:**
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/package.json`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/tsconfig.json`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/vite.config.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/main.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/App.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/styles/global.css`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.tsx`
- Test: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.test.tsx`

- [ ] **Step 1: Write the failing frontend smoke test**

```tsx
import { render, screen } from "@testing-library/react";

import { WorkbenchPage } from "./WorkbenchPage";

test("renders upload, canvas, and coverage controls", () => {
  render(<WorkbenchPage />);

  expect(screen.getByText("上传图纸")).toBeInTheDocument();
  expect(screen.getByText("图纸画布")).toBeInTheDocument();
  expect(screen.getByText("覆盖距离")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/components/WorkbenchPage.test.tsx`

Expected: FAIL because the component tree and test tooling do not exist yet.

- [ ] **Step 3: Create the minimal Vite app and workbench shell**

```tsx
export function WorkbenchPage() {
  return (
    <main>
      <aside>上传图纸</aside>
      <section>图纸画布</section>
      <aside>覆盖距离</aside>
    </main>
  );
}
```

- [ ] **Step 4: Run the test again and then start the dev server once**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/components/WorkbenchPage.test.tsx`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npm run dev`

Expected: Local page shows the three workbench regions.

- [ ] **Step 5: Commit the frontend bootstrap**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/src/main.tsx frontend/src/App.tsx frontend/src/styles/global.css frontend/src/features/workbench/components/WorkbenchPage.tsx frontend/src/features/workbench/components/WorkbenchPage.test.tsx
git commit -m "feat: bootstrap frontend workbench"
```

## Task 3: Define Project Schema And Persistence API

**Files:**
- Modify: `/Users/hanxiang/Works/Projects/cad/backend/app/main.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/models/project.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/storage.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/projects.py`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/types.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/api/client.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/api/client.test.ts`
- Test: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_projects_api.py`

- [ ] **Step 1: Write the failing project persistence API test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_create_and_fetch_project_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMERA_PLAN_DATA_DIR", str(tmp_path))
    client = TestClient(app)

    payload = {
        "name": "demo-plan",
        "scale": {"pixelsPerMeter": 42.0, "source": "manual"},
        "cameras": [],
        "walls": [],
        "doors": [],
    }

    create_response = client.post("/api/projects", json=payload)
    project_id = create_response.json()["id"]

    fetch_response = client.get(f"/api/projects/{project_id}")

    assert create_response.status_code == 201
    assert fetch_response.status_code == 200
    assert fetch_response.json()["name"] == "demo-plan"
    assert fetch_response.json()["scale"]["pixelsPerMeter"] == 42.0
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_projects_api.py -q`

Expected: FAIL because project models, storage, and routes are missing.

- [ ] **Step 3: Implement the project model, JSON storage, and typed client**

```python
class Project(BaseModel):
    id: str | None = None
    name: str
    scale: ScaleState | None = None
    cameras: list[Camera]
    walls: list[Segment]
    doors: list[Segment]
```

```ts
export interface ProjectDto {
  id?: string;
  name: string;
  scale: ScaleState | null;
  cameras: CameraDto[];
  walls: SegmentDto[];
  doors: SegmentDto[];
}
```

- [ ] **Step 4: Re-run the API test and add one fetch test on the frontend client**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_projects_api.py -q`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/api/client.test.ts`

Expected: PASS after adding a minimal contract-level test for parsing persisted project data.

- [ ] **Step 5: Commit project persistence**

```bash
git add backend/app/main.py backend/app/models/project.py backend/app/services/storage.py backend/app/api/projects.py backend/tests/test_projects_api.py frontend/src/features/workbench/types.ts frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "feat: add project persistence api"
```

## Task 4: Build Manual Editing State, Upload Flow, And Canvas Editor

**Files:**
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/state/projectReducer.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/state/projectReducer.test.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/UploadPanel.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/PlanCanvas.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ControlsPanel.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/InspectorPanel.tsx`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ResultsSummary.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.tsx`
- Test: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/state/projectReducer.test.ts`

- [ ] **Step 1: Write the failing reducer test for manual editing**

```ts
import { projectReducer } from "./projectReducer";

test("stores manual calibration and wall edits", () => {
  const state = projectReducer(undefined, {
    type: "project/calibrationSet",
    payload: { pixelsPerMeter: 50, source: "manual" },
  });

  const withWall = projectReducer(state, {
    type: "project/wallAdded",
    payload: { id: "wall-1", start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
  });

  expect(withWall.scale?.pixelsPerMeter).toBe(50);
  expect(withWall.walls).toHaveLength(1);
});
```

- [ ] **Step 2: Run the reducer test to verify it fails**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/state/projectReducer.test.ts`

Expected: FAIL because reducer actions and initial state are missing.

- [ ] **Step 3: Implement minimal editor state and wire the workbench**

```ts
export function projectReducer(state: ProjectState = initialState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "project/calibrationSet":
      return { ...state, scale: action.payload };
    case "project/wallAdded":
      return { ...state, walls: [...state.walls, action.payload] };
    default:
      return state;
  }
}
```

Important UI behavior for this task:
- Upload image or PDF and render the preview on the canvas
- Add manual calibration controls
- Add wall/door drawing mode toggles
- Show editable camera markers even before auto-layout exists

- [ ] **Step 4: Re-run tests and manually smoke-check the editor**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/state/projectReducer.test.ts src/features/workbench/components/WorkbenchPage.test.tsx`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npm run dev`

Expected: User can upload a plan, set calibration, and draw at least one wall segment on the canvas.

- [ ] **Step 5: Commit the editable workbench**

```bash
git add frontend/src/features/workbench/state/projectReducer.ts frontend/src/features/workbench/state/projectReducer.test.ts frontend/src/features/workbench/components/UploadPanel.tsx frontend/src/features/workbench/components/PlanCanvas.tsx frontend/src/features/workbench/components/ControlsPanel.tsx frontend/src/features/workbench/components/InspectorPanel.tsx frontend/src/features/workbench/components/ResultsSummary.tsx frontend/src/features/workbench/components/WorkbenchPage.tsx
git commit -m "feat: add editable plan canvas"
```

## Task 5: Implement Coverage Geometry And Occlusion-Aware Layout Solving

**Files:**
- Modify: `/Users/hanxiang/Works/Projects/cad/backend/app/main.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/models/layout.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/geometry.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/layout_solver.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/layout.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_layout_solver.py`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/lib/coverage.ts`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/lib/coverage.test.ts`

- [ ] **Step 1: Write the failing solver tests**

```python
def test_solver_places_directional_and_panoramic_cameras_without_crossing_walls():
    request = LayoutSolveRequest(
        scale=ScaleState(pixels_per_meter=40, source="manual"),
        coverage_distance_m=8,
        camera_modes=["directional", "panoramic"],
        walls=[Segment(start=Point(x=120, y=0), end=Point(x=120, y=240))],
        doors=[Segment(start=Point(x=120, y=90), end=Point(x=120, y=150))],
        region_polygon=[Point(x=0, y=0), Point(x=240, y=0), Point(x=240, y=240), Point(x=0, y=240)],
    )

    response = solve_layout(request)

    assert response.recommended_camera_count >= 2
    assert all(not coverage_crosses_wall(camera.coverage_polygon, request.walls, request.doors) for camera in response.cameras)
```

- [ ] **Step 2: Run the solver tests to verify they fail**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_layout_solver.py -q`

Expected: FAIL because the solver domain does not exist yet.

- [ ] **Step 3: Implement geometry helpers, candidate generation, and the layout route**

```python
def solve_layout(request: LayoutSolveRequest) -> LayoutSolveResponse:
    candidates = generate_candidates(request)
    selected = greedy_select(candidates, request)
    return LayoutSolveResponse.from_selected(selected, request)
```

Key rules to implement in this task:
- Directional cameras produce sector coverage polygons
- Panoramic cameras produce circular coverage polygons
- Coverage cannot cross wall segments
- Coverage may pass through door segments
- Response includes count, coverage percentage, blind spots, and overlap hints

- [ ] **Step 4: Re-run backend and frontend geometry tests**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_layout_solver.py -q`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/lib/coverage.test.ts`

Expected: PASS after adding matching polygon helpers for rendering.

- [ ] **Step 5: Commit the solver**

```bash
git add backend/app/main.py backend/app/models/layout.py backend/app/services/geometry.py backend/app/services/layout_solver.py backend/app/api/layout.py backend/tests/test_layout_solver.py frontend/src/features/workbench/lib/coverage.ts frontend/src/features/workbench/lib/coverage.test.ts
git commit -m "feat: add occlusion-aware camera solver"
```

## Task 6: Connect Auto-Layout, Slider Recalculation, And Lock-Aware Editing

**Files:**
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/api/client.ts`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/state/projectReducer.ts`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ControlsPanel.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/PlanCanvas.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/InspectorPanel.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ResultsSummary.tsx`
- Test: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.test.tsx`

- [ ] **Step 1: Write the failing workbench integration test**

```tsx
test("recalculates layout when the coverage slider changes", async () => {
  render(<WorkbenchPage />);

  await userEvent.upload(screen.getByLabelText("上传图纸"), new File(["x"], "plan.png", { type: "image/png" }));
  await userEvent.clear(screen.getByLabelText("覆盖距离"));
  await userEvent.type(screen.getByLabelText("覆盖距离"), "10");
  await userEvent.click(screen.getByText("重新计算"));

  expect(await screen.findByText("建议摄像头")).toBeInTheDocument();
  expect(await screen.findByText("盲区提示")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/components/WorkbenchPage.test.tsx`

Expected: FAIL because no layout request/response wiring exists yet.

- [ ] **Step 3: Implement API calls and lock-aware editor actions**

Required behavior:
- Coverage slider value is stored in project state
- Clicking `重新计算` sends the current plan geometry to `/api/layout/solve`
- Cameras flagged as locked remain anchored during partial recalculation
- Results summary shows recommended count, coverage rate, blind spots, and overlap hints

- [ ] **Step 4: Re-run the integration test and do a manual browser pass**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run src/features/workbench/components/WorkbenchPage.test.tsx`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npm run dev`

Expected: Slider change visibly updates the calculated overlays after recalculation.

- [ ] **Step 5: Commit auto-layout wiring**

```bash
git add frontend/src/api/client.ts frontend/src/features/workbench/state/projectReducer.ts frontend/src/features/workbench/components/WorkbenchPage.tsx frontend/src/features/workbench/components/ControlsPanel.tsx frontend/src/features/workbench/components/PlanCanvas.tsx frontend/src/features/workbench/components/InspectorPanel.tsx frontend/src/features/workbench/components/ResultsSummary.tsx frontend/src/features/workbench/components/WorkbenchPage.test.tsx
git commit -m "feat: connect auto layout workflow"
```

## Task 7: Add Export, Save/Load, And Deliverable Formatting

**Files:**
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/exporter.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_exporter.py`
- Create: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/lib/exportPlan.ts`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/WorkbenchPage.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ResultsSummary.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/backend/app/api/projects.py`
- Test: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_exporter.py`

- [ ] **Step 1: Write the failing export test**

```python
def test_exporter_creates_pdf_with_camera_labels(tmp_path):
    project = build_project_with_two_cameras()

    result = export_project(project, output_dir=tmp_path)

    assert result.png_path.exists()
    assert result.pdf_path.exists()
    assert result.project_path.exists()
```

- [ ] **Step 2: Run the export test to verify it fails**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_exporter.py -q`

Expected: FAIL because export service does not exist.

- [ ] **Step 3: Implement export services and UI triggers**

Required behavior:
- Save current project JSON to `data/projects/<id>/project.camera-plan.json`
- Export annotated PNG from the browser canvas
- Send PNG plus metadata to backend for PDF assembly
- Name cameras `CAM-01`, `CAM-02`, etc. in exports

- [ ] **Step 4: Re-run the exporter test and manually verify one export**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_exporter.py -q`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npm run dev`

Expected: Clicking `导出成果` produces PNG and PDF files plus a restorable project file.

- [ ] **Step 5: Commit export support**

```bash
git add backend/app/services/exporter.py backend/tests/test_exporter.py backend/app/api/projects.py frontend/src/features/workbench/lib/exportPlan.ts frontend/src/features/workbench/components/WorkbenchPage.tsx frontend/src/features/workbench/components/ResultsSummary.tsx
git commit -m "feat: add deliverable export flow"
```

## Task 8: Add Automatic Scale And Structure Recognition With Fallback UI

**Files:**
- Modify: `/Users/hanxiang/Works/Projects/cad/backend/app/main.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/services/recognition.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/app/api/recognition.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/test_recognition.py`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/fixtures/simple_floorplan.png`
- Create: `/Users/hanxiang/Works/Projects/cad/backend/tests/fixtures/scale_floorplan.png`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/UploadPanel.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ControlsPanel.tsx`
- Modify: `/Users/hanxiang/Works/Projects/cad/frontend/src/features/workbench/components/ResultsSummary.tsx`

- [ ] **Step 1: Write the failing recognition tests**

```python
def test_recognition_extracts_scale_and_low_confidence_segments():
    result = recognize_plan("tests/fixtures/scale_floorplan.png")

    assert result.scale is not None
    assert result.scale.source == "auto"
    assert result.confidence_items
```

- [ ] **Step 2: Run the recognition tests to verify they fail**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_recognition.py -q`

Expected: FAIL because recognition service and fixtures are missing.

- [ ] **Step 3: Implement OCR-assisted scale detection and contour-based wall extraction**

Required behavior:
- Detect candidate dimension text and dimension lines
- Return a scale calibration when confidence is sufficient
- Extract wall and door candidates as editable segments
- Mark low-confidence results so the frontend can highlight them instead of silently trusting them

- [ ] **Step 4: Re-run recognition tests and manually verify fallback UX**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest tests/test_recognition.py -q`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npm run dev`

Expected: Uploading a suitable plan auto-fills scale/wall suggestions; when confidence is low, the UI prompts for manual correction.

- [ ] **Step 5: Commit auto-recognition**

```bash
git add backend/app/main.py backend/app/services/recognition.py backend/app/api/recognition.py backend/tests/test_recognition.py backend/tests/fixtures/simple_floorplan.png backend/tests/fixtures/scale_floorplan.png frontend/src/features/workbench/components/UploadPanel.tsx frontend/src/features/workbench/components/ControlsPanel.tsx frontend/src/features/workbench/components/ResultsSummary.tsx
git commit -m "feat: add automatic plan recognition"
```

## Task 9: Final Verification, Sample Validation, And Documentation

**Files:**
- Modify: `/Users/hanxiang/Works/Projects/cad/README.md`
- Modify: `/Users/hanxiang/Works/Projects/cad/docs/superpowers/specs/2026-04-09-camera-layout-design.md`
- Create: `/Users/hanxiang/Works/Projects/cad/docs/validation/sample-results.md`

- [ ] **Step 1: Add a failing validation checklist entry to `README.md`**

```md
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Sample floor plan export generated
- [ ] Auto-recognition fallback verified
```

- [ ] **Step 2: Run the full verification suite and capture any failure first**

Run: `cd /Users/hanxiang/Works/Projects/cad/backend && python3 -m pytest -q`

Expected: PASS

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npx vitest run`

Expected: PASS

- [ ] **Step 3: Verify the user-facing workflow with at least one real sample**

Run: `cd /Users/hanxiang/Works/Projects/cad/frontend && npm run dev`

Expected manual checklist:
- Upload a real floor plan
- Accept or correct auto-detected scale
- Draw or fix at least one wall/door segment
- Recalculate after changing coverage distance
- Lock one camera and verify partial recalculation preserves it
- Export PNG and PDF successfully

- [ ] **Step 4: Document setup, limitations, and sample outcomes**

Document in:
- `/Users/hanxiang/Works/Projects/cad/README.md`
- `/Users/hanxiang/Works/Projects/cad/docs/validation/sample-results.md`

Include:
- local setup steps
- supported file types
- current OCR/recognition limitations
- known false-positive cases

- [ ] **Step 5: Commit verification and docs**

```bash
git add README.md docs/validation/sample-results.md
git commit -m "docs: record prototype validation"
```

## Notes For Execution

- Do not skip TDD. Each task must start with a failing test and only then add the smallest code needed to pass.
- Keep camera-placement math pure where possible so the backend solver is easy to test without the API layer.
- Prefer storing coordinates in image pixel space plus explicit `pixelsPerMeter`; do not mix raw pixel and meter units in the same field.
- Keep auto-recognition advisory. Low-confidence recognition should create editable suggestions, never hard-locked geometry.
- Do not add `DWG/DXF`, cloud sync, or multi-floor support in this plan.
