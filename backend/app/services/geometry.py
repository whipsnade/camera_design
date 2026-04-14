import math

from app.models.layout import CameraMode, Point, Segment

EPSILON = 1e-6


def distance(start: Point, end: Point) -> float:
    return math.hypot(end.x - start.x, end.y - start.y)


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def angle_between(start: Point, end: Point) -> float:
    return math.degrees(math.atan2(end.y - start.y, end.x - start.x)) % 360


def angle_delta(base: float, target: float) -> float:
    delta = (target - base + 180) % 360 - 180
    return abs(delta)


def point_on_segment(point: Point, segment: Segment, tolerance: float = 1e-4) -> bool:
    cross = (point.y - segment.start.y) * (segment.end.x - segment.start.x) - (
        point.x - segment.start.x
    ) * (segment.end.y - segment.start.y)
    if abs(cross) > tolerance:
        return False

    dot = (point.x - segment.start.x) * (segment.end.x - segment.start.x) + (
        point.y - segment.start.y
    ) * (segment.end.y - segment.start.y)
    if dot < -tolerance:
        return False

    squared_length = (segment.end.x - segment.start.x) ** 2 + (segment.end.y - segment.start.y) ** 2
    return dot <= squared_length + tolerance


def point_to_segment_distance(point: Point, segment: Segment) -> float:
    dx = segment.end.x - segment.start.x
    dy = segment.end.y - segment.start.y
    squared_length = dx * dx + dy * dy
    if squared_length <= EPSILON:
        return distance(point, segment.start)

    t = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / squared_length
    t = clamp(t, 0.0, 1.0)
    projection = Point(x=segment.start.x + t * dx, y=segment.start.y + t * dy)
    return distance(point, projection)


def segment_intersection(a_start: Point, a_end: Point, b_start: Point, b_end: Point) -> Point | None:
    denominator = (a_start.x - a_end.x) * (b_start.y - b_end.y) - (a_start.y - a_end.y) * (
        b_start.x - b_end.x
    )
    if abs(denominator) <= EPSILON:
        return None

    det_a = a_start.x * a_end.y - a_start.y * a_end.x
    det_b = b_start.x * b_end.y - b_start.y * b_end.x
    x = (det_a * (b_start.x - b_end.x) - (a_start.x - a_end.x) * det_b) / denominator
    y = (det_a * (b_start.y - b_end.y) - (a_start.y - a_end.y) * det_b) / denominator
    point = Point(x=x, y=y)

    if point_on_segment(point, Segment(start=a_start, end=a_end)) and point_on_segment(
        point, Segment(start=b_start, end=b_end)
    ):
        return point
    return None


def point_in_polygon(point: Point, polygon: list[Point]) -> bool:
    inside = False
    point_count = len(polygon)

    for index in range(point_count):
        current = polygon[index]
        previous = polygon[index - 1]
        intersects = ((current.y > point.y) != (previous.y > point.y)) and (
            point.x
            < (previous.x - current.x) * (point.y - current.y) / ((previous.y - current.y) or EPSILON)
            + current.x
        )
        if intersects:
            inside = not inside

    return inside


def line_intersects_any(segment_start: Point, segment_end: Point, segments: list[Segment]) -> bool:
    return any(
        segment_intersection(segment_start, segment_end, obstacle.start, obstacle.end) is not None
        for obstacle in segments
    )


def coverage_blocked_by_walls(
    origin: Point,
    target: Point,
    walls: list[Segment],
    doors: list[Segment],
) -> bool:
    if not line_intersects_any(origin, target, walls):
        return False

    if line_intersects_any(origin, target, doors):
        return False

    return True


def project_ray(
    origin: Point,
    angle_deg: float,
    radius: float,
    walls: list[Segment],
    doors: list[Segment],
) -> Point:
    target = Point(
        x=origin.x + math.cos(math.radians(angle_deg)) * radius,
        y=origin.y + math.sin(math.radians(angle_deg)) * radius,
    )
    if not coverage_blocked_by_walls(origin, target, walls, doors):
        return target

    closest_intersection: Point | None = None
    closest_distance = float("inf")
    for wall in walls:
        intersection = segment_intersection(origin, target, wall.start, wall.end)
        if intersection is None:
            continue

        current_distance = distance(origin, intersection)
        if current_distance < closest_distance:
            closest_intersection = intersection
            closest_distance = current_distance

    if closest_intersection is None:
        return target

    retreat = max(closest_distance - 1.0, 0.0)
    return Point(
        x=origin.x + math.cos(math.radians(angle_deg)) * retreat,
        y=origin.y + math.sin(math.radians(angle_deg)) * retreat,
    )


def build_coverage_polygon(
    position: Point,
    radius: float,
    mode: CameraMode,
    walls: list[Segment],
    doors: list[Segment],
    direction_deg: float | None = None,
) -> list[Point]:
    if mode == "panoramic":
        angles = [step * 15 for step in range(24)]
    else:
        facing = direction_deg if direction_deg is not None else 0.0
        angles = [facing + offset for offset in range(-60, 61, 15)]

    return [project_ray(position, angle, radius, walls, doors) for angle in angles]

