from __future__ import annotations

import json
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path

from app.models.project import Project
from app.services.storage import get_projects_data_dir


@dataclass(frozen=True)
class ExportArtifacts:
    png_path: Path
    pdf_path: Path
    project_path: Path


def export_project(project: Project, annotated_png_bytes: bytes | None = None) -> ExportArtifacts:
    export_dir = get_projects_data_dir().resolve() / project.id
    export_dir.mkdir(parents=True, exist_ok=True)

    enriched_project = _project_with_camera_labels(project)
    project_path = export_dir / "project.camera-plan.json"
    png_path = export_dir / "annotated-plan.png"
    pdf_path = export_dir / "annotated-plan.pdf"

    project_path.write_text(
        json.dumps(enriched_project.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    png_path.write_bytes(annotated_png_bytes or _render_project_png(enriched_project))
    pdf_path.write_bytes(_render_project_pdf(enriched_project))

    return ExportArtifacts(
        png_path=png_path,
        pdf_path=pdf_path,
        project_path=project_path,
    )


def _project_with_camera_labels(project: Project) -> Project:
    payload = project.model_dump(mode="json")
    labeled_cameras: list[dict[str, object]] = []

    for index, camera in enumerate(payload["cameras"], start=1):
        labeled_camera = dict(camera)
        labeled_camera.setdefault("label", f"CAM-{index:02d}")
        labeled_cameras.append(labeled_camera)

    payload["cameras"] = labeled_cameras
    return Project.model_validate(payload)


def _render_project_png(project: Project, width: int = 960, height: int = 520) -> bytes:
    pixels = bytearray([255, 255, 255, 255] * width * height)

    for wall in project.walls:
        _draw_line(pixels, width, height, int(wall.start.x), int(wall.start.y), int(wall.end.x), int(wall.end.y), (31, 41, 55, 255))

    for door in project.doors:
        _draw_line(pixels, width, height, int(door.start.x), int(door.start.y), int(door.end.x), int(door.end.y), (245, 158, 11, 255))

    for camera in project.cameras:
        x = int(float(getattr(camera, "x", 0) or 0))
        y = int(float(getattr(camera, "y", 0) or 0))
        _draw_circle(pixels, width, height, x, y, 8, (20, 184, 166, 255))

    return _encode_png(width, height, pixels)


def _draw_line(
    pixels: bytearray,
    width: int,
    height: int,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    color: tuple[int, int, int, int],
) -> None:
    dx = abs(x1 - x0)
    sx = 1 if x0 < x1 else -1
    dy = -abs(y1 - y0)
    sy = 1 if y0 < y1 else -1
    error = dx + dy

    while True:
        _set_pixel(pixels, width, height, x0, y0, color)
        if x0 == x1 and y0 == y1:
            break

        double_error = error * 2
        if double_error >= dy:
            error += dy
            x0 += sx
        if double_error <= dx:
            error += dx
            y0 += sy


def _draw_circle(
    pixels: bytearray,
    width: int,
    height: int,
    center_x: int,
    center_y: int,
    radius: int,
    color: tuple[int, int, int, int],
) -> None:
    for offset_y in range(-radius, radius + 1):
        for offset_x in range(-radius, radius + 1):
            if offset_x * offset_x + offset_y * offset_y <= radius * radius:
                _set_pixel(
                    pixels,
                    width,
                    height,
                    center_x + offset_x,
                    center_y + offset_y,
                    color,
                )


def _set_pixel(
    pixels: bytearray,
    width: int,
    height: int,
    x: int,
    y: int,
    color: tuple[int, int, int, int],
) -> None:
    if x < 0 or y < 0 or x >= width or y >= height:
        return

    index = (y * width + x) * 4
    pixels[index : index + 4] = bytes(color)


def _encode_png(width: int, height: int, rgba_pixels: bytearray) -> bytes:
    raw_rows = bytearray()
    stride = width * 4

    for row_start in range(0, len(rgba_pixels), stride):
        raw_rows.append(0)
        raw_rows.extend(rgba_pixels[row_start : row_start + stride])

    compressed = zlib.compress(bytes(raw_rows))
    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = _png_chunk(
        b"IHDR",
        struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0),
    )
    idat = _png_chunk(b"IDAT", compressed)
    iend = _png_chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + chunk_type
        + data
        + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
    )


def _render_project_pdf(project: Project) -> bytes:
    lines = [
        "Camera Layout Export",
        f"Project: {project.name}",
        f"Cameras: {len(project.cameras)}",
    ]
    for index, camera in enumerate(project.cameras, start=1):
        label = getattr(camera, "label", f"CAM-{index:02d}")
        mode = getattr(camera, "mode", "directional")
        lines.append(f"{label} ({mode})")

    content = ["BT", "/F1 16 Tf", "72 780 Td"]
    for idx, line in enumerate(lines):
        if idx == 0:
            content.append(f"({_escape_pdf_text(line)}) Tj")
            continue
        content.append("0 -22 Td")
        content.append(f"({_escape_pdf_text(line)}) Tj")
    content.append("ET")
    content_stream = "\n".join(content).encode("utf-8")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content_stream)} >>\nstream\n".encode("utf-8")
        + content_stream
        + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    body = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(body))
        body.extend(f"{index} 0 obj\n".encode("ascii"))
        body.extend(obj)
        body.extend(b"\nendobj\n")

    xref_offset = len(body)
    body.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    body.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        body.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    body.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(body)


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
