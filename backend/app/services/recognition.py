from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image
from pydantic import BaseModel

from app.models.project import Point, ScaleState, Segment


class RecognitionConfidenceItem(BaseModel):
    id: str
    message: str
    severity: str


class RecognitionResult(BaseModel):
    scale: ScaleState | None
    walls: list[Segment]
    doors: list[Segment]
    confidence_items: list[RecognitionConfidenceItem]


def recognize_plan(path: str | Path) -> RecognitionResult:
    with Image.open(path) as image:
        return recognize_plan_bytes(_image_to_bytes(image))


def recognize_plan_bytes(file_bytes: bytes) -> RecognitionResult:
    with Image.open(BytesIO(file_bytes)) as image:
        rgb_image = image.convert("RGB")

    walls = _detect_segments(rgb_image, kind="wall")
    doors = _detect_segments(rgb_image, kind="door")
    scale = _detect_scale(rgb_image)
    confidence_items = _build_confidence_items(scale=scale, walls=walls, doors=doors)

    return RecognitionResult(
        scale=scale,
        walls=walls,
        doors=doors,
        confidence_items=confidence_items,
    )


def _image_to_bytes(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format=image.format or "PNG")
    return buffer.getvalue()


def _detect_scale(image: Image.Image) -> ScaleState | None:
    green_points = _points_matching(
        image,
        lambda red, green, blue: green > 120 and red < 80 and blue < 120,
    )
    if not green_points:
        return None

    xs = [point[0] for point in green_points]
    pixels_per_meter = round((max(xs) - min(xs) + 1) / 3, 2)
    return ScaleState(pixelsPerMeter=pixels_per_meter, source="auto")


def _build_confidence_items(
    scale: ScaleState | None,
    walls: list[Segment],
    doors: list[Segment],
) -> list[RecognitionConfidenceItem]:
    items = [
        RecognitionConfidenceItem(
            id="structure-review",
            message="请确认自动识别的墙体和门洞位置。",
            severity="warning",
        )
    ]

    if scale is None:
        items.append(
            RecognitionConfidenceItem(
                id="scale-missing",
                message="未可靠识别比例尺，请手工确认像素每米。",
                severity="warning",
            )
        )

    if len(walls) < 4:
        items.append(
            RecognitionConfidenceItem(
                id="wall-count-low",
                message="墙体识别数量偏少，请检查边界。",
                severity="warning",
            )
        )

    if not doors:
        items.append(
            RecognitionConfidenceItem(
                id="door-missing",
                message="未检测到门洞，请手工补充。",
                severity="warning",
            )
        )

    return items


def _detect_segments(image: Image.Image, kind: str) -> list[Segment]:
    predicate = _wall_pixel if kind == "wall" else _door_pixel
    min_length = 28 if kind == "wall" else 20

    horizontal = _merge_horizontal_runs(image, predicate, min_length=min_length)
    vertical = _merge_vertical_runs(image, predicate, min_length=min_length)
    return horizontal + vertical


def _points_matching(image: Image.Image, predicate) -> list[tuple[int, int]]:
    width, height = image.size
    points: list[tuple[int, int]] = []
    pixels = image.load()

    for y in range(height):
        for x in range(width):
            if predicate(*pixels[x, y]):
                points.append((x, y))

    return points


def _wall_pixel(red: int, green: int, blue: int) -> bool:
    return red < 80 and green < 80 and blue < 80


def _door_pixel(red: int, green: int, blue: int) -> bool:
    return red > 180 and 80 < green < 220 and blue < 120


def _merge_horizontal_runs(image: Image.Image, predicate, min_length: int) -> list[Segment]:
    width, height = image.size
    pixels = image.load()
    groups: list[dict[str, float]] = []

    for y in range(height):
        x = 0
        while x < width:
            while x < width and not predicate(*pixels[x, y]):
                x += 1
            start = x
            while x < width and predicate(*pixels[x, y]):
                x += 1
            end = x - 1

            if end - start + 1 < min_length:
                continue

            matched = False
            for group in groups:
                if abs(group["start"] - start) <= 4 and abs(group["end"] - end) <= 4 and y <= group["last_y"] + 1:
                    group["rows"] += 1
                    group["last_y"] = y
                    group["start_sum"] += start
                    group["end_sum"] += end
                    matched = True
                    break

            if not matched:
                groups.append(
                    {
                        "start": float(start),
                        "end": float(end),
                        "start_sum": float(start),
                        "end_sum": float(end),
                        "first_y": float(y),
                        "last_y": float(y),
                        "rows": 1.0,
                    }
                )

    return [
        Segment(
            start=Point(
                x=group["start_sum"] / group["rows"],
                y=(group["first_y"] + group["last_y"]) / 2,
            ),
            end=Point(
                x=group["end_sum"] / group["rows"],
                y=(group["first_y"] + group["last_y"]) / 2,
            ),
        )
        for group in groups
        if group["rows"] >= 3
    ]


def _merge_vertical_runs(image: Image.Image, predicate, min_length: int) -> list[Segment]:
    width, height = image.size
    pixels = image.load()
    groups: list[dict[str, float]] = []

    for x in range(width):
        y = 0
        while y < height:
            while y < height and not predicate(*pixels[x, y]):
                y += 1
            start = y
            while y < height and predicate(*pixels[x, y]):
                y += 1
            end = y - 1

            if end - start + 1 < min_length:
                continue

            matched = False
            for group in groups:
                if abs(group["start"] - start) <= 4 and abs(group["end"] - end) <= 4 and x <= group["last_x"] + 1:
                    group["columns"] += 1
                    group["last_x"] = x
                    group["start_sum"] += start
                    group["end_sum"] += end
                    matched = True
                    break

            if not matched:
                groups.append(
                    {
                        "start": float(start),
                        "end": float(end),
                        "start_sum": float(start),
                        "end_sum": float(end),
                        "first_x": float(x),
                        "last_x": float(x),
                        "columns": 1.0,
                    }
                )

    return [
        Segment(
            start=Point(
                x=(group["first_x"] + group["last_x"]) / 2,
                y=group["start_sum"] / group["columns"],
            ),
            end=Point(
                x=(group["first_x"] + group["last_x"]) / 2,
                y=group["end_sum"] / group["columns"],
            ),
        )
        for group in groups
        if group["columns"] >= 3
    ]
