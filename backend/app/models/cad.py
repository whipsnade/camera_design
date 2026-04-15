from typing import Literal

from pydantic import BaseModel, ConfigDict


class CadPoint(BaseModel):
    x: float
    y: float


class CadViewport(BaseModel):
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    width: float
    height: float


class CadSegment(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    kind: Literal["wall", "door"]
    source_type: str
    layer: str | None = None
    start: CadPoint
    end: CadPoint
    source_path: str | None = None
    source_handle: str | None = None


class CadWarning(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    message: str
    severity: Literal["info", "warning", "error"] = "warning"
    source_path: str | None = None
    source_type: str | None = None


class CadImportResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    units_per_meter: float | None = None
    unit_source: str
    viewport: CadViewport
    walls: list[CadSegment]
    doors: list[CadSegment]
    warnings: list[CadWarning]
