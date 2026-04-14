from dataclasses import dataclass

from app.models.layout import (
    CameraCoverage,
    CameraMode,
    LayoutSolveRequest,
    LayoutSolveResponse,
    Point,
)
from app.services.geometry import (
    angle_between,
    angle_delta,
    build_coverage_polygon,
    coverage_blocked_by_walls,
    distance,
    point_in_polygon,
    point_to_segment_distance,
)


@dataclass(frozen=True)
class CandidateCamera:
    id: str
    mode: CameraMode
    position: Point
    direction_deg: float | None


def sample_region_points(region_polygon: list[Point], step: float) -> list[Point]:
    min_x = min(point.x for point in region_polygon)
    max_x = max(point.x for point in region_polygon)
    min_y = min(point.y for point in region_polygon)
    max_y = max(point.y for point in region_polygon)

    points: list[Point] = []
    y = min_y + step / 2
    while y < max_y:
        x = min_x + step / 2
        while x < max_x:
            point = Point(x=x, y=y)
            if point_in_polygon(point, region_polygon):
                points.append(point)
            x += step
        y += step

    return points


def candidate_positions(request: LayoutSolveRequest) -> list[Point]:
    min_x = min(point.x for point in request.region_polygon)
    max_x = max(point.x for point in request.region_polygon)
    min_y = min(point.y for point in request.region_polygon)
    max_y = max(point.y for point in request.region_polygon)
    width = max_x - min_x
    height = max_y - min_y

    xs = [min_x + width * ratio for ratio in (0.25, 0.5, 0.75)]
    ys = [min_y + height * ratio for ratio in (0.25, 0.5, 0.75)]
    positions: list[Point] = []

    for x in xs:
        for y in ys:
            point = Point(x=x, y=y)
            if not point_in_polygon(point, request.region_polygon):
                continue

            too_close_to_wall = any(
                point_to_segment_distance(point, wall) < 4.0 for wall in request.walls
            )
            if not too_close_to_wall:
                positions.append(point)

    return positions


def build_candidates(request: LayoutSolveRequest) -> list[CandidateCamera]:
    positions = candidate_positions(request)
    candidates: list[CandidateCamera] = []
    camera_index = 1

    for position in positions:
        for mode in request.camera_modes:
            if mode == "panoramic":
                candidates.append(
                    CandidateCamera(
                        id=f"candidate-{camera_index}",
                        mode=mode,
                        position=position,
                        direction_deg=None,
                    )
                )
                camera_index += 1
                continue

            for direction_deg in (0.0, 90.0, 180.0, 270.0):
                candidates.append(
                    CandidateCamera(
                        id=f"candidate-{camera_index}",
                        mode=mode,
                        position=position,
                        direction_deg=direction_deg,
                    )
                )
                camera_index += 1

    return candidates


def point_visible_from_candidate(
    candidate: CandidateCamera,
    point: Point,
    radius: float,
    walls,
    doors,
) -> bool:
    if distance(candidate.position, point) > radius:
        return False

    if candidate.mode == "directional":
        facing = candidate.direction_deg if candidate.direction_deg is not None else 0.0
        if angle_delta(facing, angle_between(candidate.position, point)) > 60:
            return False

    return not coverage_blocked_by_walls(candidate.position, point, walls, doors)


def select_candidates(
    request: LayoutSolveRequest,
    candidates: list[CandidateCamera],
    sample_points: list[Point],
) -> list[CandidateCamera]:
    radius = request.coverage_distance_m * request.scale.pixelsPerMeter
    uncovered = set(range(len(sample_points)))
    selected: list[CandidateCamera] = []

    while uncovered:
        best_candidate: CandidateCamera | None = None
        best_score = 0

        for candidate in candidates:
            if candidate in selected:
                continue

            score = sum(
                1
                for index in uncovered
                if point_visible_from_candidate(
                    candidate,
                    sample_points[index],
                    radius,
                    request.walls,
                    request.doors,
                )
            )
            if candidate.mode not in {item.mode for item in selected} and score > 0:
                score += 1

            if score > best_score:
                best_score = score
                best_candidate = candidate

        if best_candidate is None or best_score == 0:
            break

        selected.append(best_candidate)
        uncovered = {
            index
            for index in uncovered
            if not point_visible_from_candidate(
                best_candidate,
                sample_points[index],
                radius,
                request.walls,
                request.doors,
            )
        }

        if len(selected) >= max(len(request.camera_modes), 4):
            break

    selected_modes = {candidate.mode for candidate in selected}
    for mode in request.camera_modes:
        if mode in selected_modes:
            continue

        fallback = next((candidate for candidate in candidates if candidate.mode == mode), None)
        if fallback is not None and fallback not in selected:
            selected.append(fallback)

    return selected


def solve_layout(request: LayoutSolveRequest) -> LayoutSolveResponse:
    radius = request.coverage_distance_m * request.scale.pixelsPerMeter
    sampling_step = max(radius / 3, 20.0)
    sample_points = sample_region_points(request.region_polygon, sampling_step)
    candidates = build_candidates(request)
    selected_candidates = select_candidates(request, candidates, sample_points)

    cameras: list[CameraCoverage] = []
    coverage_counts: list[int] = [0 for _ in sample_points]

    for index, candidate in enumerate(selected_candidates, start=1):
        cameras.append(
            CameraCoverage(
                id=f"CAM-{index:02d}",
                mode=candidate.mode,
                position=candidate.position,
                direction_deg=candidate.direction_deg,
                coverage_polygon=build_coverage_polygon(
                    candidate.position,
                    radius,
                    candidate.mode,
                    request.walls,
                    request.doors,
                    candidate.direction_deg,
                ),
            )
        )
        for point_index, sample_point in enumerate(sample_points):
            if point_visible_from_candidate(
                candidate,
                sample_point,
                radius,
                request.walls,
                request.doors,
            ):
                coverage_counts[point_index] += 1

    covered_points = [sample_points[index] for index, count in enumerate(coverage_counts) if count > 0]
    blind_spots = [sample_points[index] for index, count in enumerate(coverage_counts) if count == 0]
    overlap_hints = [sample_points[index] for index, count in enumerate(coverage_counts) if count > 1]
    coverage_ratio = len(covered_points) / len(sample_points) if sample_points else 0.0

    return LayoutSolveResponse(
        recommended_camera_count=len(cameras),
        coverage_ratio=round(coverage_ratio, 4),
        blind_spots=blind_spots,
        overlap_hints=overlap_hints,
        cameras=cameras,
    )
