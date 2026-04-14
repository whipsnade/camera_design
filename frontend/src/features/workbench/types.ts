export interface PointDto {
  x: number;
  y: number;
}

export interface ScaleState {
  pixelsPerMeter: number;
  source: string;
}

export interface SegmentDto {
  id?: string;
  start: PointDto;
  end: PointDto;
  [key: string]: unknown;
}

export interface CameraDto {
  id?: string;
  [key: string]: unknown;
}

export type CameraModeDto = "directional" | "panoramic";

export interface LayoutCameraDto {
  id: string;
  mode: CameraModeDto;
  position: PointDto;
  directionDeg: number | null;
  coveragePolygon: PointDto[];
}

export interface LayoutResultDto {
  recommendedCameraCount: number;
  coverageRatio: number;
  blindSpots: PointDto[];
  overlapHints: PointDto[];
  cameras: LayoutCameraDto[];
}

export interface LayoutSolveRequestDto {
  scale: ScaleState;
  coverageDistanceM: number;
  cameraModes: CameraModeDto[];
  walls: SegmentDto[];
  doors: SegmentDto[];
  regionPolygon: PointDto[];
}

export interface ProjectDto {
  id: string;
  name: string;
  scale: ScaleState | null;
  cameras: CameraDto[];
  walls: SegmentDto[];
  doors: SegmentDto[];
}

export type ProjectCreateDto = Omit<ProjectDto, "id">;

export interface ExportBundleDto {
  pngPath: string;
  pdfPath: string;
  projectPath: string;
}

export interface RecognitionConfidenceItemDto {
  id: string;
  message: string;
  severity: string;
}

export interface RecognitionResultDto {
  scale: ScaleState | null;
  walls: SegmentDto[];
  doors: SegmentDto[];
  confidenceItems: RecognitionConfidenceItemDto[];
}
