from typing import Literal

from pydantic import BaseModel


CameraMode = Literal["directional", "panoramic"]


class Point(BaseModel):
    x: float
    y: float


class Segment(BaseModel):
    id: str | None = None
    start: Point
    end: Point


class ScaleState(BaseModel):
    pixelsPerMeter: float
    source: str


class LayoutSolveRequest(BaseModel):
    scale: ScaleState
    coverage_distance_m: float
    camera_modes: list[CameraMode]
    walls: list[Segment]
    doors: list[Segment]
    region_polygon: list[Point]


class CameraCoverage(BaseModel):
    id: str
    mode: CameraMode
    position: Point
    direction_deg: float | None = None
    coverage_polygon: list[Point]


class LayoutSolveResponse(BaseModel):
    recommended_camera_count: int
    coverage_ratio: float
    blind_spots: list[Point]
    overlap_hints: list[Point]
    cameras: list[CameraCoverage]
