import type {
  CameraModeDto,
  CameraDto,
  ExportBundleDto,
  LayoutCameraDto,
  LayoutResultDto,
  LayoutSolveRequestDto,
  ProjectCreateDto,
  ProjectDto,
  PointDto,
  ScaleState,
  SegmentDto
} from "../features/workbench/types";

const API_PREFIX = "/api";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseScaleState(value: unknown): ScaleState | null {
  if (value === null) {
    return null;
  }

  if (
    !isObject(value) ||
    typeof value.pixelsPerMeter !== "number" ||
    typeof value.source !== "string"
  ) {
    throw new Error("Invalid scale state");
  }

  return {
    pixelsPerMeter: value.pixelsPerMeter,
    source: value.source
  };
}

function parsePoint(value: unknown): PointDto {
  if (!isObject(value) || typeof value.x !== "number" || typeof value.y !== "number") {
    throw new Error("Invalid point");
  }

  return { x: value.x, y: value.y };
}

function parseCameraMode(value: unknown): CameraModeDto {
  if (value !== "directional" && value !== "panoramic") {
    throw new Error("Invalid camera mode");
  }

  return value;
}

function parseExportBundleDto(value: unknown): ExportBundleDto {
  if (
    !isObject(value) ||
    typeof value.png_path !== "string" ||
    typeof value.pdf_path !== "string" ||
    typeof value.project_path !== "string"
  ) {
    throw new Error("Invalid export payload");
  }

  return {
    pngPath: value.png_path,
    pdfPath: value.pdf_path,
    projectPath: value.project_path
  };
}

function parseLayoutCameraDto(value: unknown): LayoutCameraDto {
  if (!isObject(value) || typeof value.id !== "string" || !Array.isArray(value.coverage_polygon)) {
    throw new Error("Invalid layout camera");
  }

  return {
    id: value.id,
    mode: parseCameraMode(value.mode),
    position: parsePoint(value.position),
    directionDeg: typeof value.direction_deg === "number" ? value.direction_deg : null,
    coveragePolygon: value.coverage_polygon.map(parsePoint)
  };
}

export function parseLayoutResultDto(value: unknown): LayoutResultDto {
  if (
    !isObject(value) ||
    typeof value.recommended_camera_count !== "number" ||
    typeof value.coverage_ratio !== "number" ||
    !Array.isArray(value.blind_spots) ||
    !Array.isArray(value.overlap_hints) ||
    !Array.isArray(value.cameras)
  ) {
    throw new Error("Invalid layout payload");
  }

  return {
    recommendedCameraCount: value.recommended_camera_count,
    coverageRatio: value.coverage_ratio,
    blindSpots: value.blind_spots.map(parsePoint),
    overlapHints: value.overlap_hints.map(parsePoint),
    cameras: value.cameras.map(parseLayoutCameraDto)
  };
}

export function parseProjectDto(value: unknown): ProjectDto {
  if (!isObject(value)) {
    throw new Error("Invalid project payload");
  }

  const { id, name, scale, cameras, walls, doors } = value;

  if (typeof id !== "string") {
    throw new Error("Invalid project id");
  }

  if (typeof name !== "string") {
    throw new Error("Invalid project name");
  }

  if (!Array.isArray(cameras) || !Array.isArray(walls) || !Array.isArray(doors)) {
    throw new Error("Invalid project collections");
  }

  return {
    id,
    name,
    scale: parseScaleState(scale),
    cameras: cameras as CameraDto[],
    walls: walls as SegmentDto[],
    doors: doors as SegmentDto[]
  };
}

async function requestProject(path: string, init: RequestInit): Promise<ProjectDto> {
  const response = await fetch(`${API_PREFIX}${path}`, init);

  if (!response.ok) {
    throw new Error(`Project request failed with status ${response.status}`);
  }

  return parseProjectDto(await response.json());
}

export function createProject(project: ProjectCreateDto): Promise<ProjectDto> {
  const payload: ProjectCreateDto = {
    name: project.name,
    scale: project.scale,
    cameras: project.cameras,
    walls: project.walls,
    doors: project.doors
  };

  return requestProject("/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export function getProject(projectId: string): Promise<ProjectDto> {
  return requestProject(`/projects/${projectId}`, {
    method: "GET"
  });
}

export async function solveLayout(request: LayoutSolveRequestDto): Promise<LayoutResultDto> {
  const response = await fetch(`${API_PREFIX}/layout/solve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      scale: request.scale,
      coverage_distance_m: request.coverageDistanceM,
      camera_modes: request.cameraModes,
      walls: request.walls,
      doors: request.doors,
      region_polygon: request.regionPolygon
    })
  });

  if (!response.ok) {
    throw new Error(`Layout request failed with status ${response.status}`);
  }

  return parseLayoutResultDto(await response.json());
}

interface ExportProjectBundleRequest {
  projectId: string;
  metadataJson: string;
  annotatedPngBlob?: Blob;
}

export async function exportProjectBundle(
  request: ExportProjectBundleRequest
): Promise<ExportBundleDto> {
  const formData = new FormData();
  formData.set("metadata_json", request.metadataJson);

  if (request.annotatedPngBlob) {
    formData.set("annotated_png", request.annotatedPngBlob, "annotated-plan.png");
  }

  const response = await fetch(`${API_PREFIX}/projects/${request.projectId}/export`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Export request failed with status ${response.status}`);
  }

  return parseExportBundleDto(await response.json());
}
