import { useRef } from "react";
import type { MouseEvent } from "react";

import type { ManualCamera, SelectedEntity } from "../state/projectReducer";
import type { DwgImportViewportDto, LayoutResultDto, PointDto, SegmentDto } from "../types";

interface PlanCanvasProps {
  cameras: ManualCamera[];
  doors: SegmentDto[];
  draftPoint: PointDto | null;
  layoutResult: LayoutResultDto | null;
  regionPolygon: PointDto[];
  regionDraftPoints: PointDto[];
  selected: SelectedEntity | null;
  viewport: DwgImportViewportDto | null;
  walls: SegmentDto[];
  onCanvasClick: (point: PointDto) => void;
  onSelect: (selection: SelectedEntity | null) => void;
}

const DEFAULT_VIEWPORT: DwgImportViewportDto = {
  minX: 0,
  minY: 0,
  maxX: 1000,
  maxY: 1000,
  width: 1000,
  height: 1000
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function collectBounds(points: PointDto[]): DwgImportViewportDto | null {
  if (!points.length) {
    return null;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return { minX, minY, maxX, maxY, width, height };
}

function resolveViewport(props: Pick<
  PlanCanvasProps,
  "viewport" | "walls" | "doors" | "cameras" | "layoutResult" | "regionPolygon" | "regionDraftPoints" | "draftPoint"
>): DwgImportViewportDto {
  if (props.viewport) {
    return props.viewport;
  }

  const points: PointDto[] = [];

  for (const wall of props.walls) {
    points.push(wall.start, wall.end);
  }

  for (const door of props.doors) {
    points.push(door.start, door.end);
  }

  for (const camera of props.cameras) {
    points.push({ x: camera.x, y: camera.y });
  }

  for (const point of props.regionPolygon) {
    points.push(point);
  }

  for (const point of props.regionDraftPoints) {
    points.push(point);
  }

  if (props.draftPoint) {
    points.push(props.draftPoint);
  }

  for (const camera of props.layoutResult?.cameras ?? []) {
    points.push(...camera.coveragePolygon);
  }

  for (const point of props.layoutResult?.blindSpots ?? []) {
    points.push(point);
  }

  for (const point of props.layoutResult?.overlapHints ?? []) {
    points.push(point);
  }

  return collectBounds(points) ?? DEFAULT_VIEWPORT;
}

function toPoint(
  event: MouseEvent<HTMLDivElement>,
  element: HTMLDivElement,
  viewport: DwgImportViewportDto
): PointDto {
  const bounds = element.getBoundingClientRect();
  const cssX = event.clientX - bounds.left;
  const cssY = event.clientY - bounds.top;
  const scaleX = bounds.width / viewport.width;
  const scaleY = bounds.height / viewport.height;
  const scale = Math.min(scaleX, scaleY) || 1;
  const offsetX = (bounds.width - viewport.width * scale) / 2;
  const offsetY = (bounds.height - viewport.height * scale) / 2;

  return {
    x: viewport.minX + clamp((cssX - offsetX) / scale, 0, viewport.width),
    y: viewport.minY + clamp((cssY - offsetY) / scale, 0, viewport.height)
  };
}

function isSelected(selected: SelectedEntity | null, type: SelectedEntity["type"], id?: string) {
  return selected?.type === type && selected.id === id;
}

export function PlanCanvas({
  cameras,
  doors,
  draftPoint,
  layoutResult,
  regionPolygon,
  regionDraftPoints,
  selected,
  viewport,
  walls,
  onCanvasClick,
  onSelect
}: PlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const effectiveViewport = resolveViewport({
    viewport,
    walls,
    doors,
    cameras,
    layoutResult,
    regionPolygon,
    regionDraftPoints,
    draftPoint
  });

  return (
    <div
      aria-label="plan canvas"
      onClick={(event) => {
        if (!containerRef.current) {
          return;
        }

        onCanvasClick(toPoint(event, containerRef.current, effectiveViewport));
      }}
      ref={containerRef}
      style={{
        position: "relative",
        marginTop: 18,
        minHeight: 520,
        borderRadius: 24,
        overflow: "hidden",
        border: "1px dashed rgba(19, 34, 56, 0.22)",
        backgroundColor: "rgba(248, 250, 252, 0.94)",
        backgroundImage:
          "linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }}
    >
      <svg
        viewBox={`${effectiveViewport.minX} ${effectiveViewport.minY} ${effectiveViewport.width} ${effectiveViewport.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%"
        }}
      >
        {regionPolygon.length >= 3 && (
          <polygon
            points={regionPolygon.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="rgba(99, 102, 241, 0.08)"
            stroke="rgba(99, 102, 241, 0.5)"
            strokeWidth={2}
            strokeDasharray="10 5"
          />
        )}
        {regionDraftPoints.map((point, index) => {
          if (index === 0) {
            return null;
          }

          const prev = regionDraftPoints[index - 1];
          return (
            <line
              key={`region-draft-line-${index}`}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke="rgba(99, 102, 241, 0.7)"
              strokeWidth={3}
              strokeDasharray="8 4"
            />
          );
        })}
        {regionDraftPoints.map((point, index) => (
          <circle
            key={`region-draft-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === 0 ? 10 : 7}
            fill={index === 0 ? "rgba(99, 102, 241, 0.9)" : "rgba(99, 102, 241, 0.6)"}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
        {regionDraftPoints.length >= 3 && (
          <circle
            cx={regionDraftPoints[0].x}
            cy={regionDraftPoints[0].y}
            r={20}
            fill="none"
            stroke="rgba(99, 102, 241, 0.4)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
        {layoutResult?.cameras.map((camera) => (
          <polygon
            data-coverage-camera-id={camera.id}
            fill={camera.mode === "panoramic" ? "rgba(45, 91, 255, 0.12)" : "rgba(20, 184, 166, 0.16)"}
            key={`coverage-${camera.id}`}
            points={camera.coveragePolygon.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={camera.mode === "panoramic" ? "rgba(45, 91, 255, 0.35)" : "rgba(20, 184, 166, 0.45)"}
            strokeWidth={2}
          />
        ))}
        {layoutResult?.blindSpots.map((point, index) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill="rgba(220, 38, 38, 0.88)"
            key={`blind-${index}`}
            r={5}
          />
        ))}
        {layoutResult?.overlapHints.map((point, index) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill="rgba(245, 158, 11, 0.82)"
            key={`overlap-${index}`}
            r={5}
          />
        ))}
        {walls.map((wall) => (
          <line
            data-segment-id={wall.id}
            key={wall.id}
            onClick={(event) => {
              event.stopPropagation();
              if (wall.id) {
                onSelect({ type: "wall", id: wall.id });
              }
            }}
            stroke={isSelected(selected, "wall", wall.id) ? "#2d5bff" : "#1f2937"}
            strokeLinecap="round"
            strokeWidth={isSelected(selected, "wall", wall.id) ? 10 : 8}
            x1={wall.start.x}
            x2={wall.end.x}
            y1={wall.start.y}
            y2={wall.end.y}
          />
        ))}
        {doors.map((door) => (
          <line
            data-segment-id={door.id}
            key={door.id}
            onClick={(event) => {
              event.stopPropagation();
              if (door.id) {
                onSelect({ type: "door", id: door.id });
              }
            }}
            stroke={isSelected(selected, "door", door.id) ? "#ff7d36" : "#f59e0b"}
            strokeLinecap="round"
            strokeWidth={isSelected(selected, "door", door.id) ? 10 : 8}
            x1={door.start.x}
            x2={door.end.x}
            y1={door.start.y}
            y2={door.end.y}
          />
        ))}
        {cameras.map((camera) => (
          <circle
            cx={camera.x}
            cy={camera.y}
            data-camera-id={camera.id}
            fill={isSelected(selected, "camera", camera.id) ? "#0f766e" : "#14b8a6"}
            key={camera.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ type: "camera", id: camera.id });
            }}
            r={isSelected(selected, "camera", camera.id) ? 22 : 18}
            stroke="#ecfeff"
            strokeWidth={4}
          />
        ))}
        {draftPoint ? <circle cx={draftPoint.x} cy={draftPoint.y} fill="#dc2626" r={8} /> : null}
      </svg>
    </div>
  );
}
