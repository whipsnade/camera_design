import { useEffect, useReducer, type Dispatch } from "react";

import { ControlsPanel } from "./ControlsPanel";
import { InspectorPanel } from "./InspectorPanel";
import { PlanCanvas } from "./PlanCanvas";
import { ResultsSummary } from "./ResultsSummary";
import { UploadPanel } from "./UploadPanel";
import {
  initialState,
  projectReducer,
  type DrawMode,
  type ManualCamera,
  type ProjectAction,
  type ProjectState
} from "../state/projectReducer";
import type { PointDto, SegmentDto } from "../types";

function makeSegment(kind: "wall" | "door", start: PointDto, end: PointDto): SegmentDto {
  return {
    id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    start,
    end
  };
}

function makeCamera(point: PointDto, index: number): ManualCamera {
  return {
    id: `camera-${index + 1}`,
    x: point.x,
    y: point.y
  };
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
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

export function WorkbenchPage() {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  useEffect(() => {
    return () => {
      if (state.upload?.url) {
        URL.revokeObjectURL(state.upload.url);
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
              URL.revokeObjectURL(state.upload.url);
            }

            dispatch({
              type: "project/uploadSet",
              payload: {
                kind: isPdf(file) ? "pdf" : "image",
                name: file.name,
                url: URL.createObjectURL(file)
              }
            });
          }}
          upload={state.upload}
        />
        <ControlsPanel
          activeMode={state.drawMode}
          hasSelection={Boolean(state.selected)}
          onDeleteSelected={() => dispatch({ type: "project/selectedDeleted" })}
          onModeChange={(mode) => dispatch({ type: "project/modeSet", payload: mode })}
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
          onCanvasClick={(point) => {
            if (state.drawMode === "camera") {
              dispatch({
                type: "project/cameraAdded",
                payload: makeCamera(point, state.cameras.length)
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
          doorCount={state.doors.length}
          pixelsPerMeter={state.scale?.pixelsPerMeter ?? null}
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
          selected={state.selected}
          wall={selectedWall}
        />
      </aside>
    </main>
  );
}
