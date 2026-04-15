from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.models.cad import CadImportResult, CadPoint, CadSegment, CadViewport, CadWarning
from app.services.cad_geometry import (
    AffineTransform,
    apply_transforms,
    bounds_from_segments,
    point_from_value,
    polyline_to_segments,
    sample_arc_points,
    sample_circle_points,
)


class DwgImportError(RuntimeError):
    pass


_LINE_LIKE_TYPES = {"LINE", "LWPOLYLINE", "ARC", "CIRCLE"}
_DOOR_KEYWORDS = ("door", "doorway", "entry", "gate")
_WALL_KEYWORDS = ("wall", "partition", "boundary", "outline", "room")
_UNITS_PER_METER = {
    1: 39.37007874015748,
    2: 3.280839895013123,
    3: 0.000621371192237334,
    4: 1000.0,
    5: 100.0,
    6: 1.0,
    7: 0.001,
}


@dataclass(frozen=True)
class EntityContext:
    path: str
    inherited_kind: str | None = None


def import_dwg_file(path: str | Path) -> CadImportResult:
    dwgread = shutil.which("dwgread")
    if dwgread is None:
        raise DwgImportError("dwgread is not installed")

    completed = subprocess.run(
        [dwgread, "-O", "JSON", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise DwgImportError(
            f"dwgread failed with exit code {completed.returncode}: {completed.stderr.strip()}"
        )

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise DwgImportError("dwgread did not return valid JSON") from exc

    return normalize_dwg_payload(payload)


def normalize_dwg_payload(payload: Mapping[str, Any]) -> CadImportResult:
    warnings: list[CadWarning] = []
    units_per_meter, unit_source = _extract_units(payload, warnings)
    blocks = _extract_blocks(payload)
    entities = _extract_modelspace_entities(payload)

    normalized_segments: list[CadSegment] = []
    for index, entity in enumerate(entities, start=1):
        normalized_segments.extend(
            _normalize_entity(
                entity,
                blocks=blocks,
                transforms=(),
                context=EntityContext(path=f"modelspace[{index}]"),
                warnings=warnings,
                segment_prefix=f"entity-{index}",
            )
        )

    walls = [segment for segment in normalized_segments if segment.kind == "wall"]
    doors = [segment for segment in normalized_segments if segment.kind == "door"]
    viewport = _build_viewport(walls + doors)

    return CadImportResult(
        units_per_meter=units_per_meter,
        unit_source=unit_source,
        viewport=viewport,
        walls=walls,
        doors=doors,
        warnings=warnings,
    )


def _extract_units(
    payload: Mapping[str, Any],
    warnings: list[CadWarning],
) -> tuple[float | None, str]:
    header = _first_mapping(payload, "header", "dwg_header", "HEADER")
    if header is None:
        warnings.append(
            CadWarning(
                id="units-missing",
                message="未找到 DWG 单位信息，请手工校准。",
                severity="warning",
                source_path="header",
            )
        )
        return None, "header:missing"

    raw_unit = _first_value(header, "insunits", "$insunits", "INSUNITS", "units")
    if not isinstance(raw_unit, (int, float)):
        warnings.append(
            CadWarning(
                id="units-unavailable",
                message="DWG 单位信息不可读，请手工校准。",
                severity="warning",
                source_path="header.insunits",
            )
        )
        return None, "header:insunits=unknown"

    units_code = int(raw_unit)
    units_per_meter = _UNITS_PER_METER.get(units_code)
    if units_per_meter is None:
        warnings.append(
            CadWarning(
                id="units-unsupported",
                message=f"DWG 单位代码 {units_code} 暂不支持，请手工校准。",
                severity="warning",
                source_path="header.insunits",
            )
        )
        return None, f"header:insunits={units_code}"

    return units_per_meter, f"header:insunits={units_code}"


def _extract_blocks(payload: Mapping[str, Any]) -> dict[str, list[Mapping[str, Any]]]:
    raw_blocks = _first_mapping(payload, "blocks", "block_records", "BLOCKS")
    if raw_blocks is None:
        return {}

    blocks: dict[str, list[Mapping[str, Any]]] = {}
    for block_name, block_definition in raw_blocks.items():
        if isinstance(block_definition, Mapping):
            entities = _extract_entities_from_container(block_definition)
        elif isinstance(block_definition, list):
            entities = [entity for entity in block_definition if isinstance(entity, Mapping)]
        else:
            entities = []
        blocks[str(block_name)] = entities

    return blocks


def _extract_modelspace_entities(payload: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    for key in ("modelspace", "entities", "objects", "model_space", "MODELSPACE"):
        value = payload.get(key)
        if isinstance(value, list):
            return [entity for entity in value if isinstance(entity, Mapping)]
        if isinstance(value, Mapping):
            entities = _extract_entities_from_container(value)
            if entities:
                return entities
    return []


def _extract_entities_from_container(container: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    for key in ("entities", "objects", "items", "modelspace"):
        value = container.get(key)
        if isinstance(value, list):
            return [entity for entity in value if isinstance(entity, Mapping)]
    return []


def _normalize_entity(
    entity: Mapping[str, Any],
    *,
    blocks: dict[str, list[Mapping[str, Any]]],
    transforms: Sequence[AffineTransform],
    context: EntityContext,
    warnings: list[CadWarning],
    segment_prefix: str,
) -> list[CadSegment]:
    entity_type = _entity_type(entity)
    source_path = context.path
    source_handle = _string_value(entity, "handle", "id", "object_handle")
    layer = _string_value(entity, "layer", "Layer")
    kind = _infer_kind(entity, inherited_kind=context.inherited_kind)

    if entity_type == "INSERT":
        block_name = _string_value(entity, "block", "name", "block_name", "blockName")
        if block_name is None:
            warnings.append(
                CadWarning(
                    id=f"{segment_prefix}-missing-block-name",
                    message="块参照缺少 block/name 字段，已跳过。",
                    severity="warning",
                    source_path=source_path,
                    source_type=entity_type,
                )
            )
            return []

        block_entities = blocks.get(block_name)
        if block_entities is None:
            warnings.append(
                CadWarning(
                    id=f"{segment_prefix}-missing-block-{block_name}",
                    message=f"未找到块定义 {block_name}，已跳过。",
                    severity="warning",
                    source_path=source_path,
                    source_type=entity_type,
                )
            )
            return []

        local_transform = _insert_transform(entity)
        inherited_kind = kind or context.inherited_kind
        normalized: list[CadSegment] = []
        for child_index, child in enumerate(block_entities, start=1):
            normalized.extend(
                _normalize_entity(
                    child,
                    blocks=blocks,
                    transforms=(local_transform, *transforms),
                    context=EntityContext(
                        path=f"{source_path}>{block_name}[{child_index}]",
                        inherited_kind=inherited_kind,
                    ),
                    warnings=warnings,
                    segment_prefix=f"{segment_prefix}-{block_name.lower()}-{child_index}",
                )
            )
        return normalized

    if entity_type not in _LINE_LIKE_TYPES:
        warnings.append(
            CadWarning(
                id=f"unsupported-entity-{len(warnings) + 1}",
                message=f"暂不支持的实体类型 {entity_type}，已跳过。",
                severity="warning",
                source_path=source_path,
                source_type=entity_type,
            )
        )
        return []

    if kind is None:
        kind = "wall"

    if entity_type == "LINE":
        start = point_from_value(_first_value(entity, "start", "start_point", "p1", "from"))
        end = point_from_value(_first_value(entity, "end", "end_point", "p2", "to"))
        if start is None or end is None:
            warnings.append(
                CadWarning(
                    id=f"{segment_prefix}-invalid-line",
                    message="LINE 实体缺少起点或终点，已跳过。",
                    severity="warning",
                    source_path=source_path,
                    source_type=entity_type,
                )
            )
            return []
        transformed_start = apply_transforms(start, transforms)
        transformed_end = apply_transforms(end, transforms)
        return [
            CadSegment(
                id=f"{segment_prefix}-1",
                kind=kind,  # type: ignore[arg-type]
                source_type=entity_type,
                layer=layer,
                start=transformed_start,
                end=transformed_end,
                source_path=source_path,
                source_handle=source_handle,
            )
        ]

    if entity_type == "LWPOLYLINE":
        vertices = _extract_vertices(entity)
        if len(vertices) < 2:
            warnings.append(
                CadWarning(
                    id=f"{segment_prefix}-invalid-polyline",
                    message="LWPOLYLINE 顶点不足，已跳过。",
                    severity="warning",
                    source_path=source_path,
                    source_type=entity_type,
                )
            )
            return []

        transformed_vertices = [apply_transforms(point, transforms) for point in vertices]
        closed = _is_closed_polyline(entity)
        return polyline_to_segments(
            transformed_vertices,
            closed=closed,
            kind=kind,
            layer=layer,
            source_type=entity_type,
            source_path=source_path,
            source_handle=source_handle,
            segment_prefix=segment_prefix,
        )

    if entity_type == "ARC":
        center = point_from_value(_first_value(entity, "center", "center_point"))
        radius = _numeric_value(entity, "radius", "r")
        start_angle = _numeric_value(entity, "start_angle", "startAngle", "start")
        end_angle = _numeric_value(entity, "end_angle", "endAngle", "end")
        if center is None or radius is None or start_angle is None or end_angle is None:
            warnings.append(
                CadWarning(
                    id=f"{segment_prefix}-invalid-arc",
                    message="ARC 实体缺少中心、半径或角度，已跳过。",
                    severity="warning",
                    source_path=source_path,
                    source_type=entity_type,
                )
            )
            return []

        arc_points = sample_arc_points(center, radius, start_angle, end_angle)
        transformed_points = [apply_transforms(point, transforms) for point in arc_points]
        return polyline_to_segments(
            transformed_points,
            closed=False,
            kind=kind,
            layer=layer,
            source_type=entity_type,
            source_path=source_path,
            source_handle=source_handle,
            segment_prefix=segment_prefix,
        )

    if entity_type == "CIRCLE":
        center = point_from_value(_first_value(entity, "center", "center_point"))
        radius = _numeric_value(entity, "radius", "r")
        if center is None or radius is None:
            warnings.append(
                CadWarning(
                    id=f"{segment_prefix}-invalid-circle",
                    message="CIRCLE 实体缺少中心或半径，已跳过。",
                    severity="warning",
                    source_path=source_path,
                    source_type=entity_type,
                )
            )
            return []

        circle_points = sample_circle_points(center, radius)
        transformed_points = [apply_transforms(point, transforms) for point in circle_points]
        return polyline_to_segments(
            transformed_points,
            closed=False,
            kind=kind,
            layer=layer,
            source_type=entity_type,
            source_path=source_path,
            source_handle=source_handle,
            segment_prefix=segment_prefix,
        )

    warnings.append(
        CadWarning(
            id=f"unsupported-entity-{len(warnings) + 1}",
            message=f"暂不支持的实体类型 {entity_type}，已跳过。",
            severity="warning",
            source_path=source_path,
            source_type=entity_type,
        )
    )
    return []


def _insert_transform(entity: Mapping[str, Any]) -> AffineTransform:
    translation = point_from_value(_first_value(entity, "position", "insert_point", "insertion_point"))
    if translation is None:
        translation = CadPoint(x=0.0, y=0.0)

    rotation = _numeric_value(entity, "rotation", "rotation_deg", "angle") or 0.0
    scale = _numeric_value(entity, "scale", "scales")
    scale_x = _numeric_value(entity, "xscale", "scale_x") or scale or 1.0
    scale_y = _numeric_value(entity, "yscale", "scale_y") or scale or 1.0

    return AffineTransform(
        translate_x=translation.x,
        translate_y=translation.y,
        rotation_deg=rotation,
        scale_x=scale_x,
        scale_y=scale_y,
    )


def _extract_vertices(entity: Mapping[str, Any]) -> list[CadPoint]:
    for key in ("vertices", "points", "coords", "vertices_list", "points_list"):
        value = entity.get(key)
        if isinstance(value, list):
            points = [point_from_value(item) for item in value]
            return [point for point in points if point is not None]

    vertex_map = entity.get("vertexs")
    if isinstance(vertex_map, list):
        points = [point_from_value(item) for item in vertex_map]
        return [point for point in points if point is not None]

    return []


def _is_closed_polyline(entity: Mapping[str, Any]) -> bool:
    closed_value = entity.get("closed")
    if isinstance(closed_value, bool):
        return closed_value

    for key in ("is_closed", "closed", "closed_polyline"):
        value = entity.get(key)
        if isinstance(value, bool):
            return value

    flags = entity.get("flags")
    if isinstance(flags, (int, float)):
        return bool(int(flags) & 1)

    return False


def _build_viewport(segments: Sequence[CadSegment]) -> CadViewport:
    if not segments:
        return CadViewport(
            min_x=0.0,
            min_y=0.0,
            max_x=0.0,
            max_y=0.0,
            width=0.0,
            height=0.0,
        )

    min_x, min_y, max_x, max_y = bounds_from_segments(segments)
    return CadViewport(
        min_x=min_x,
        min_y=min_y,
        max_x=max_x,
        max_y=max_y,
        width=max_x - min_x,
        height=max_y - min_y,
    )


def _infer_kind(
    entity: Mapping[str, Any],
    inherited_kind: str | None = None,
) -> str | None:
    if inherited_kind in {"wall", "door"}:
        return inherited_kind

    tokens = " ".join(
        filter(
            None,
            (
                _entity_type(entity),
                _string_value(entity, "layer", "Layer"),
                _string_value(entity, "name", "block", "block_name", "blockName"),
            ),
        )
    ).lower()

    if any(keyword in tokens for keyword in _DOOR_KEYWORDS):
        return "door"

    if any(keyword in tokens for keyword in _WALL_KEYWORDS):
        return "wall"

    return None


def _entity_type(entity: Mapping[str, Any]) -> str:
    value = _string_value(entity, "type", "entity_type", "entityType", "subclass")
    return value.upper() if value else "UNKNOWN"


def _first_mapping(container: Mapping[str, Any], *keys: str) -> Mapping[str, Any] | None:
    for key in keys:
        value = container.get(key)
        if isinstance(value, Mapping):
            return value
    return None


def _first_value(container: Mapping[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in container:
            return container[key]
        lower_key = key.lower()
        if lower_key in container:
            return container[lower_key]
    return None


def _string_value(container: Mapping[str, Any], *keys: str) -> str | None:
    value = _first_value(container, *keys)
    if isinstance(value, str):
        return value
    return None


def _numeric_value(container: Mapping[str, Any], *keys: str) -> float | None:
    value = _first_value(container, *keys)
    if isinstance(value, (int, float)):
        return float(value)
    return None
