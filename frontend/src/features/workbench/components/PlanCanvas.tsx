import { useRef } from "react";
import type { MouseEvent } from "react";

import type { DrawMode, ManualCamera, SelectedEntity, UploadAsset } from "../state/projectReducer";
import type { LayoutResultDto, PointDto, SegmentDto } from "../types";

interface PlanCanvasProps {
  cameras: ManualCamera[];
  doors: SegmentDto[];
  draftPoint: PointDto | null;
  layoutResult: LayoutResultDto | null;
  selected: SelectedEntity | null;
  upload: UploadAsset | null;
  walls: SegmentDto[];
  onCanvasClick: (point: PointDto) => void;
  onSelect: (selection: SelectedEntity | null) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toPoint(event: MouseEvent<HTMLDivElement>, element: HTMLDivElement): PointDto {
  const bounds = element.getBoundingClientRect();

  return {
    x: clamp(event.clientX - bounds.left, 0, bounds.width),
    y: clamp(event.clientY - bounds.top, 0, bounds.height)
  };
}

function isSelected(selected: SelectedEntity | null, type: SelectedEntity["type"], id?: string) {
  return selected?.type === type && selected.id === id;
}

function renderPreview(upload: UploadAsset | null) {
  if (!upload) {
    return null;
  }

  if (upload.kind === "pdf") {
    return (
      <iframe
        src={upload.url}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
          pointerEvents: "none"
        }}
        title="plan-preview"
      />
    );
  }

  return (
    <img
      alt="plan-preview"
      src={upload.url}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none"
      }}
    />
  );
}

export function PlanCanvas({
  cameras,
  doors,
  draftPoint,
  layoutResult,
  selected,
  upload,
  walls,
  onCanvasClick,
  onSelect
}: PlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      aria-label="plan canvas"
      onClick={(event) => {
        if (!containerRef.current) {
          return;
        }

        onCanvasClick(toPoint(event, containerRef.current));
      }}
      ref={containerRef}
      style={{
        position: "relative",
        marginTop: 18,
        minHeight: 520,
        borderRadius: 24,
        overflow: "hidden",
        border: "1px dashed rgba(19, 34, 56, 0.22)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(237,243,252,0.92) 100%)"
      }}
    >
      {renderPreview(upload)}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%"
        }}
      >
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
