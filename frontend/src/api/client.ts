import type {
  CameraDto,
  ProjectCreateDto,
  ProjectDto,
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
