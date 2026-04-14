import type {
  CameraDto,
  CameraModeDto,
  LayoutResultDto,
  PointDto,
  ScaleState,
  SegmentDto
} from "../types";

export type DrawMode = "select" | "wall" | "door" | "camera";
export type SelectedEntityType = "wall" | "door" | "camera";

export interface ManualCamera extends CameraDto {
  id: string;
  x: number;
  y: number;
  locked: boolean;
  mode: CameraModeDto;
  source: "manual" | "solver";
}

export interface UploadAsset {
  kind: "image" | "pdf";
  name: string;
  url: string;
}

export interface SelectedEntity {
  id: string;
  type: SelectedEntityType;
}

export interface ProjectState {
  name: string;
  scale: ScaleState | null;
  cameras: ManualCamera[];
  walls: SegmentDto[];
  doors: SegmentDto[];
  coverageDistanceM: number;
  layoutResult: LayoutResultDto | null;
  layoutStatus: "idle" | "loading" | "ready" | "error";
  upload: UploadAsset | null;
  drawMode: DrawMode;
  draftPoint: PointDto | null;
  selected: SelectedEntity | null;
}

export type ProjectAction =
  | { type: "project/calibrationSet"; payload: ScaleState }
  | { type: "project/coverageDistanceSet"; payload: number }
  | { type: "project/wallAdded"; payload: SegmentDto }
  | { type: "project/doorAdded"; payload: SegmentDto }
  | { type: "project/cameraAdded"; payload: ManualCamera }
  | { type: "project/cameraUpdated"; payload: { id: string; x: number; y: number } }
  | { type: "project/cameraLockToggled"; payload: { id: string } }
  | { type: "project/layoutRequestStarted" }
  | {
      type: "project/layoutRequestSucceeded";
      payload: { cameras: ManualCamera[]; layoutResult: LayoutResultDto };
    }
  | { type: "project/layoutRequestFailed" }
  | { type: "project/uploadSet"; payload: UploadAsset | null }
  | { type: "project/modeSet"; payload: DrawMode }
  | { type: "project/draftPointSet"; payload: PointDto | null }
  | { type: "project/selectedSet"; payload: SelectedEntity | null }
  | { type: "project/selectedDeleted" };

export const initialState: ProjectState = {
  name: "未命名项目",
  scale: null,
  cameras: [],
  walls: [],
  doors: [],
  coverageDistanceM: 8,
  layoutResult: null,
  layoutStatus: "idle",
  upload: null,
  drawMode: "wall",
  draftPoint: null,
  selected: null
};

export function projectReducer(
  state: ProjectState = initialState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    case "project/calibrationSet":
      return { ...state, scale: action.payload };
    case "project/coverageDistanceSet":
      return { ...state, coverageDistanceM: action.payload };
    case "project/wallAdded":
      return {
        ...state,
        walls: [...state.walls, action.payload],
        draftPoint: null
      };
    case "project/doorAdded":
      return {
        ...state,
        doors: [...state.doors, action.payload],
        draftPoint: null
      };
    case "project/cameraAdded":
      return {
        ...state,
        cameras: [...state.cameras, action.payload],
        draftPoint: null,
        selected: { type: "camera", id: action.payload.id }
      };
    case "project/cameraUpdated":
      return {
        ...state,
        cameras: state.cameras.map((camera) =>
          camera.id === action.payload.id ? { ...camera, ...action.payload } : camera
        ),
        layoutResult: state.layoutResult
          ? {
              ...state.layoutResult,
              cameras: state.layoutResult.cameras.map((camera) =>
                camera.id === action.payload.id
                  ? {
                      ...camera,
                      position: { x: action.payload.x, y: action.payload.y }
                    }
                  : camera
              )
            }
          : null
      };
    case "project/cameraLockToggled":
      return {
        ...state,
        cameras: state.cameras.map((camera) =>
          camera.id === action.payload.id ? { ...camera, locked: !camera.locked } : camera
        )
      };
    case "project/layoutRequestStarted":
      return {
        ...state,
        layoutStatus: "loading"
      };
    case "project/layoutRequestSucceeded":
      return {
        ...state,
        cameras: action.payload.cameras,
        layoutResult: action.payload.layoutResult,
        layoutStatus: "ready"
      };
    case "project/layoutRequestFailed":
      return {
        ...state,
        layoutStatus: "error"
      };
    case "project/uploadSet":
      return {
        ...state,
        upload: action.payload,
        draftPoint: null
      };
    case "project/modeSet":
      return {
        ...state,
        drawMode: action.payload,
        draftPoint: null
      };
    case "project/draftPointSet":
      return { ...state, draftPoint: action.payload };
    case "project/selectedSet":
      return { ...state, draftPoint: null, selected: action.payload };
    case "project/selectedDeleted":
      if (!state.selected) {
        return state;
      }

      if (state.selected.type === "wall") {
        return {
          ...state,
          walls: state.walls.filter((wall) => wall.id !== state.selected?.id),
          draftPoint: null,
          selected: null
        };
      }

      if (state.selected.type === "door") {
        return {
          ...state,
          doors: state.doors.filter((door) => door.id !== state.selected?.id),
          draftPoint: null,
          selected: null
        };
      }

      return {
        ...state,
        cameras: state.cameras.filter((camera) => camera.id !== state.selected?.id),
        layoutResult: state.layoutResult
          ? {
              ...state.layoutResult,
              cameras: state.layoutResult.cameras.filter(
                (camera) => camera.id !== state.selected?.id
              ),
              recommendedCameraCount: state.layoutResult.cameras.filter(
                (camera) => camera.id !== state.selected?.id
              ).length
            }
          : null,
        draftPoint: null,
        selected: null
      };
    default:
      return state;
  }
}
