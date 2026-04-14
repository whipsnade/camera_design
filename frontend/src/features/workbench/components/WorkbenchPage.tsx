import { useEffect, useReducer, type Dispatch } from "react";

import { solveLayout } from "../../../api/client";
import { ControlsPanel } from "./ControlsPanel";
import { InspectorPanel } from "./InspectorPanel";
import { PlanCanvas } from "./PlanCanvas";
import { ResultsSummary } from "./ResultsSummary";
import { UploadPanel } from "./UploadPanel";
import { buildCoveragePolygon } from "../lib/coverage";
import {
  initialState,
  projectReducer,
  type DrawMode,
  type ManualCamera,
  type ProjectAction,
  type ProjectState
} from "../state/projectReducer";
import type {
  LayoutCameraDto,
  LayoutResultDto,
  PointDto,
  SegmentDto
} from "../types";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 520;

function makeSegment(kind: "wall" | "door", start: PointDto, end: PointDto): SegmentDto {
  return {
    id: `${kind}-${crypto.randomUUID()}`,
    start,
    end
  };
}

function makeCamera(point: PointDto): ManualCamera {
  return {
    id: `camera-${crypto.randomUUID()}`,
    x: point.x,
    y: point.y,
    locked: false,
    mode: "directional",
    source: "manual"
  };
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function createPreviewUrl(file: File) {
  if (typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(file);
  }

  return `blob:${file.name}`;
}

function revokePreviewUrl(url: string) {
  if (typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

function getSelectedSegment(state: ProjectState, kind: "wall" | "door") {
  if (!state.selected || state.selected.type !== kind) {
    return null;
  }

  const source = kind === "wall" ? state.walls : state.doors;
  return source.find((segment) => segment.id === state.selected?.id) ?? null;
}

function dispatchSegment(
  dispatch: Dispatch<ProjectAction>,
  mode: DrawMode,
  start: PointDto,
  end: PointDto
) {
  if (mode === "wall") {
    dispatch({ type: "project/wallAdded", payload: makeSegment("wall", start, end) });
    return;
  }

  if (mode === "door") {
    dispatch({ type: "project/doorAdded", payload: makeSegment("door", start, end) });
  }
}

function getRegionPolygon(): PointDto[] {
  return [
    { x: 0, y: 0 },
    { x: CANVAS_WIDTH, y: 0 },
    { x: CANVAS_WIDTH, y: CANVAS_HEIGHT },
    { x: 0, y: CANVAS_HEIGHT }
  ];
}

function toSolverCamera(camera: LayoutCameraDto): ManualCamera {
  return {
    id: camera.id,
    x: camera.position.x,
    y: camera.position.y,
    locked: false,
    mode: camera.mode,
    source: "solver"
  };
}

function mergeLockedLayout(
  state: ProjectState,
  result: LayoutResultDto
): { cameras: ManualCamera[]; layoutResult: LayoutResultDto } {
  if (!state.scale) {
    return {
      cameras: result.cameras.map(toSolverCamera),
      layoutResult: result
    };
  }

  const radius = state.coverageDistanceM * state.scale.pixelsPerMeter;
  const lockedCameras = state.cameras.filter((camera) => camera.locked);
  const lockedIds = new Set(lockedCameras.map((camera) => camera.id));

  const mergedSolverCameras = result.cameras.filter((camera) => !lockedIds.has(camera.id));
  const mergedLockedLayoutCameras: LayoutCameraDto[] = lockedCameras.map((camera) => ({
    id: camera.id,
    mode: camera.mode,
    position: { x: camera.x, y: camera.y },
    directionDeg: camera.mode === "directional" ? 0 : null,
    coveragePolygon: buildCoveragePolygon(
      {
        id: camera.id,
        mode: camera.mode,
        position: { x: camera.x, y: camera.y },
        radius,
        directionDeg: camera.mode === "directional" ? 0 : undefined
      },
      state.walls,
      state.doors
    )
  }));

  return {
    cameras: [
      ...lockedCameras,
      ...mergedSolverCameras.map(toSolverCamera)
    ],
    layoutResult: {
      ...result,
      recommendedCameraCount: mergedLockedLayoutCameras.length + mergedSolverCameras.length,
      cameras: [...mergedLockedLayoutCameras, ...mergedSolverCameras]
    }
  };
}

export function WorkbenchPage() {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  useEffect(() => {
    return () => {
      if (state.upload?.url) {
        revokePreviewUrl(state.upload.url);
      }
    };
  }, [state.upload]);

  const selectedCamera =
    state.selected?.type === "camera"
      ? state.cameras.find((camera) => camera.id === state.selected?.id) ?? null
      : null;
  const selectedWall = getSelectedSegment(state, "wall");
  const selectedDoor = getSelectedSegment(state, "door");

  return (
    <main className="workbench-layout" aria-label="workbench layout">
      <aside className="workbench-panel workbench-panel--sidebar">
        上传图纸
        <UploadPanel
          onUpload={(file) => {
            if (state.upload?.url) {
              revokePreviewUrl(state.upload.url);
            }

            dispatch({
              type: "project/uploadSet",
              payload: {
                kind: isPdf(file) ? "pdf" : "image",
                name: file.name,
                url: createPreviewUrl(file)
              }
            });
          }}
          upload={state.upload}
        />
        <ControlsPanel
          activeMode={state.drawMode}
          coverageDistanceM={state.coverageDistanceM}
          hasSelection={Boolean(state.selected)}
          layoutStatus={state.layoutStatus}
          onCoverageDistanceChange={(value) =>
            dispatch({ type: "project/coverageDistanceSet", payload: value })
          }
          onDeleteSelected={() => dispatch({ type: "project/selectedDeleted" })}
          onModeChange={(mode) => dispatch({ type: "project/modeSet", payload: mode })}
          onRecalculate={async () => {
            if (!state.scale) {
              return;
            }

            dispatch({ type: "project/layoutRequestStarted" });

            try {
              const result = await solveLayout({
                scale: state.scale,
                coverageDistanceM: state.coverageDistanceM,
                cameraModes: ["directional", "panoramic"],
                walls: state.walls,
                doors: state.doors,
                regionPolygon: getRegionPolygon()
              });
              const merged = mergeLockedLayout(state, result);

              dispatch({
                type: "project/layoutRequestSucceeded",
                payload: merged
              });
            } catch {
              dispatch({ type: "project/layoutRequestFailed" });
            }
          }}
          onScaleChange={(pixelsPerMeter) =>
            dispatch({
              type: "project/calibrationSet",
              payload: { pixelsPerMeter, source: "manual" }
            })
          }
          pixelsPerMeter={state.scale?.pixelsPerMeter ?? null}
        />
      </aside>
      <section className="workbench-panel workbench-panel--canvas">
        图纸画布
        <PlanCanvas
          cameras={state.cameras}
          doors={state.doors}
          draftPoint={state.draftPoint}
          layoutResult={state.layoutResult}
          onCanvasClick={(point) => {
            if (state.drawMode === "camera") {
              dispatch({
                type: "project/cameraAdded",
                payload: makeCamera(point)
              });
              return;
            }

            if (state.drawMode === "select") {
              dispatch({ type: "project/selectedSet", payload: null });
              return;
            }

            if (!state.draftPoint) {
              dispatch({ type: "project/draftPointSet", payload: point });
              return;
            }

            dispatchSegment(dispatch, state.drawMode, state.draftPoint, point);
          }}
          onSelect={(selection) => dispatch({ type: "project/selectedSet", payload: selection })}
          selected={state.selected}
          upload={state.upload}
          walls={state.walls}
        />
      </section>
      <aside className="workbench-panel workbench-panel--sidebar">
        覆盖距离
        <ResultsSummary
          cameraCount={state.cameras.length}
          coverageRatio={state.layoutResult?.coverageRatio ?? null}
          doorCount={state.doors.length}
          overlapHintCount={state.layoutResult?.overlapHints.length ?? 0}
          pixelsPerMeter={state.scale?.pixelsPerMeter ?? null}
          recommendedCameraCount={state.layoutResult?.recommendedCameraCount ?? null}
          blindSpotCount={state.layoutResult?.blindSpots.length ?? 0}
          wallCount={state.walls.length}
        />
        <InspectorPanel
          camera={selectedCamera}
          door={selectedDoor}
          onCameraChange={(next) => {
            if (!selectedCamera) {
              return;
            }

            dispatch({
              type: "project/cameraUpdated",
              payload: { id: selectedCamera.id, x: next.x, y: next.y }
            });
          }}
          onCameraLockToggle={() => {
            if (!selectedCamera) {
              return;
            }

            dispatch({
              type: "project/cameraLockToggled",
              payload: { id: selectedCamera.id }
            });
          }}
          selected={state.selected}
          wall={selectedWall}
        />
      </aside>
    </main>
  );
}
