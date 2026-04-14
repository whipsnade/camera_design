import type { PointDto, SegmentDto } from "../types";

export interface CoverageCamera {
  id: string;
  mode: "directional" | "panoramic";
  position: PointDto;
  radius: number;
  directionDeg?: number;
}

const EPSILON = 1e-6;

function pointOnSegment(point: PointDto, segment: SegmentDto, tolerance = 1e-4) {
  const cross =
    (point.y - segment.start.y) * (segment.end.x - segment.start.x) -
    (point.x - segment.start.x) * (segment.end.y - segment.start.y);

  if (Math.abs(cross) > tolerance) {
    return false;
  }

  const dot =
    (point.x - segment.start.x) * (segment.end.x - segment.start.x) +
    (point.y - segment.start.y) * (segment.end.y - segment.start.y);

  if (dot < -tolerance) {
    return false;
  }

  const squaredLength =
    (segment.end.x - segment.start.x) ** 2 + (segment.end.y - segment.start.y) ** 2;

  return dot <= squaredLength + tolerance;
}

function segmentIntersection(
  aStart: PointDto,
  aEnd: PointDto,
  bStart: PointDto,
  bEnd: PointDto
): PointDto | null {
  const denominator =
    (aStart.x - aEnd.x) * (bStart.y - bEnd.y) - (aStart.y - aEnd.y) * (bStart.x - bEnd.x);

  if (Math.abs(denominator) <= EPSILON) {
    return null;
  }

  const detA = aStart.x * aEnd.y - aStart.y * aEnd.x;
  const detB = bStart.x * bEnd.y - bStart.y * bEnd.x;
  const point = {
    x: (detA * (bStart.x - bEnd.x) - (aStart.x - aEnd.x) * detB) / denominator,
    y: (detA * (bStart.y - bEnd.y) - (aStart.y - aEnd.y) * detB) / denominator
  };

  if (
    pointOnSegment(point, { start: aStart, end: aEnd }) &&
    pointOnSegment(point, { start: bStart, end: bEnd })
  ) {
    return point;
  }

  return null;
}

export function coverageBlockedByWalls(
  origin: PointDto,
  target: PointDto,
  walls: SegmentDto[],
  doors: SegmentDto[]
) {
  const intersectsWall = walls.some(
    (wall) => segmentIntersection(origin, target, wall.start, wall.end) !== null
  );

  if (!intersectsWall) {
    return false;
  }

  return !doors.some((door) => segmentIntersection(origin, target, door.start, door.end) !== null);
}

function projectRay(
  origin: PointDto,
  angleDeg: number,
  radius: number,
  walls: SegmentDto[],
  doors: SegmentDto[]
) {
  const radians = (angleDeg * Math.PI) / 180;
  const target = {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y + Math.sin(radians) * radius
  };

  if (!coverageBlockedByWalls(origin, target, walls, doors)) {
    return target;
  }

  let closestPoint: PointDto | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    const intersection = segmentIntersection(origin, target, wall.start, wall.end);
    if (!intersection) {
      continue;
    }

    const currentDistance = Math.hypot(intersection.x - origin.x, intersection.y - origin.y);
    if (currentDistance < closestDistance) {
      closestDistance = currentDistance;
      closestPoint = intersection;
    }
  }

  if (!closestPoint) {
    return target;
  }

  const retreat = Math.max(closestDistance - 1, 0);
  return {
    x: origin.x + Math.cos(radians) * retreat,
    y: origin.y + Math.sin(radians) * retreat
  };
}

export function buildCoveragePolygon(
  camera: CoverageCamera,
  walls: SegmentDto[],
  doors: SegmentDto[]
) {
  const angles =
    camera.mode === "panoramic"
      ? Array.from({ length: 24 }, (_, index) => index * 15)
      : Array.from({ length: 9 }, (_, index) => (camera.directionDeg ?? 0) - 60 + index * 15);

  return angles.map((angle) => projectRay(camera.position, angle, camera.radius, walls, doors));
}
