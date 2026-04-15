from pydantic import BaseModel, ConfigDict, model_validator


class Point(BaseModel):
    x: float
    y: float


class ScaleState(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    unitsPerMeter: float | None = None
    pixelsPerMeter: float | None = None
    source: str

    @model_validator(mode="before")
    @classmethod
    def migrate_scale_fields(cls, value):
        if not isinstance(value, dict):
            return value

        migrated = dict(value)
        units_per_meter = migrated.get("unitsPerMeter")
        pixels_per_meter = migrated.get("pixelsPerMeter")

        if units_per_meter is None and isinstance(pixels_per_meter, (int, float)):
            migrated["unitsPerMeter"] = float(pixels_per_meter)

        if pixels_per_meter is None and isinstance(units_per_meter, (int, float)):
            migrated["pixelsPerMeter"] = float(units_per_meter)

        return migrated


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
