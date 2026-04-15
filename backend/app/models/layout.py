from typing import Literal

from pydantic import BaseModel

from app.models.project import Point, ScaleState, Segment


CameraMode = Literal["directional", "panoramic"]


class CameraCoverage(BaseModel):
    id: str
    mode: CameraMode
    position: Point
    direction_deg: float | None = None
    coverage_polygon: list[Point]
    is_auto_generated: bool = True
    is_modified: bool = False
    locked: bool = False


class LayoutSolveRequest(BaseModel):
    scale: ScaleState
    coverage_distance_m: float
    camera_modes: list[CameraMode]
    walls: list[Segment]
    doors: list[Segment]
    region_polygon: list[Point]
    locked_cameras: list[CameraCoverage] = []
    field_of_view_deg: float = 120.0
    ray_count: int = 16


class LayoutSolveResponse(BaseModel):
    recommended_camera_count: int
    coverage_ratio: float
    blind_spots: list[Point]
    overlap_hints: list[Point]
    cameras: list[CameraCoverage]
