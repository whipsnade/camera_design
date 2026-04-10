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

export interface ProjectDto {
  id?: string;
  name: string;
  scale: ScaleState | null;
  cameras: CameraDto[];
  walls: SegmentDto[];
  doors: SegmentDto[];
}
