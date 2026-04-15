from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from app.models.cad import CadPoint, CadSegment


@dataclass(frozen=True)
class AffineTransform:
    translate_x: float = 0.0
    translate_y: float = 0.0
    rotation_deg: float = 0.0
    scale_x: float = 1.0
    scale_y: float = 1.0


def point_from_value(value: object) -> CadPoint | None:
    if isinstance(value, CadPoint):
        return value

    if isinstance(value, Mapping):
        if isinstance(value.get("x"), (int, float)) and isinstance(value.get("y"), (int, float)):
            return CadPoint(x=float(value["x"]), y=float(value["y"]))

        if isinstance(value.get("point"), Mapping):
            return point_from_value(value["point"])

        if isinstance(value.get("location"), Mapping):
            return point_from_value(value["location"])

    if isinstance(value, Sequence) and len(value) >= 2:
        x, y = value[0], value[1]
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            return CadPoint(x=float(x), y=float(y))

    return None


def apply_transform(point: CadPoint, transform: AffineTransform) -> CadPoint:
    scaled_x = point.x * transform.scale_x
    scaled_y = point.y * transform.scale_y

    if transform.rotation_deg:
        radians = math.radians(transform.rotation_deg)
        rotated_x = scaled_x * math.cos(radians) - scaled_y * math.sin(radians)
        rotated_y = scaled_x * math.sin(radians) + scaled_y * math.cos(radians)
    else:
        rotated_x = scaled_x
        rotated_y = scaled_y

    return CadPoint(
        x=rotated_x + transform.translate_x,
        y=rotated_y + transform.translate_y,
    )


def apply_transforms(point: CadPoint, transforms: Iterable[AffineTransform]) -> CadPoint:
    transformed = point
    for transform in transforms:
        transformed = apply_transform(transformed, transform)
    return transformed


def sample_arc_points(
    center: CadPoint,
    radius: float,
    start_angle: float,
    end_angle: float,
    minimum_steps: int = 6,
) -> list[CadPoint]:
    normalized_start = start_angle % 360
    normalized_end = end_angle % 360
    sweep = normalized_end - normalized_start
    if sweep <= 0:
        sweep += 360

    steps = max(minimum_steps, int(abs(sweep) / 15) + 1)
    points: list[CadPoint] = []
    for step in range(steps + 1):
        angle = math.radians(normalized_start + sweep * (step / steps))
        points.append(
            CadPoint(
                x=center.x + math.cos(angle) * radius,
                y=center.y + math.sin(angle) * radius,
            )
        )
    return points


def sample_circle_points(center: CadPoint, radius: float, steps: int = 24) -> list[CadPoint]:
    points: list[CadPoint] = []
    for step in range(steps):
        angle = math.radians((360 / steps) * step)
        points.append(
            CadPoint(
                x=center.x + math.cos(angle) * radius,
                y=center.y + math.sin(angle) * radius,
            )
        )
    points.append(points[0])
    return points


def polyline_to_segments(
    points: Sequence[CadPoint],
    *,
    closed: bool,
    kind: str,
    layer: str | None,
    source_type: str,
    source_path: str,
    source_handle: str | None,
    segment_prefix: str,
) -> list[CadSegment]:
    usable_points = list(points)
    if len(usable_points) < 2:
        return []

    if closed and usable_points[0] != usable_points[-1]:
        usable_points.append(usable_points[0])

    segments: list[CadSegment] = []
    for index in range(len(usable_points) - 1):
        segments.append(
            CadSegment(
                id=f"{segment_prefix}-{index + 1}",
                kind=kind,  # type: ignore[arg-type]
                source_type=source_type,
                layer=layer,
                start=usable_points[index],
                end=usable_points[index + 1],
                source_path=source_path,
                source_handle=source_handle,
            )
        )

    return segments


def bounds_from_segments(segments: Sequence[CadSegment]) -> tuple[float, float, float, float]:
    points = [segment.start for segment in segments] + [segment.end for segment in segments]
    if not points:
        return 0.0, 0.0, 0.0, 0.0

    min_x = min(point.x for point in points)
    max_x = max(point.x for point in points)
    min_y = min(point.y for point in points)
    max_y = max(point.y for point in points)
    return min_x, min_y, max_x, max_y
