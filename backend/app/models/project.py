from pydantic import BaseModel, ConfigDict


class Point(BaseModel):
    x: float
    y: float


class ScaleState(BaseModel):
    pixelsPerMeter: float
    source: str


class Segment(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    start: Point
    end: Point


class Camera(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None


class ProjectPayload(BaseModel):
    name: str
    scale: ScaleState | None = None
    cameras: list[Camera]
    walls: list[Segment]
    doors: list[Segment]


class ProjectCreate(ProjectPayload):
    pass


class Project(ProjectPayload):
    id: str
