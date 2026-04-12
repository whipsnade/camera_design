import type { ManualCamera, SelectedEntity, SelectedEntityType } from "../state/projectReducer";
import type { SegmentDto } from "../types";

interface InspectorPanelProps {
  camera: ManualCamera | null;
  door: SegmentDto | null;
  selected: SelectedEntity | null;
  wall: SegmentDto | null;
  onCameraChange: (next: { x: number; y: number }) => void;
}

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(19, 34, 56, 0.18)",
  padding: "10px 12px",
  background: "rgba(244, 247, 252, 0.95)"
} as const;

function getTypeValue(type: SelectedEntityType | null) {
  if (!type) {
    return "";
  }

  if (type === "wall") {
    return "wall";
  }

  if (type === "door") {
    return "door";
  }

  return "camera";
}

export function InspectorPanel({
  camera,
  door,
  selected,
  wall,
  onCameraChange
}: InspectorPanelProps) {
  const activeSegment = selected?.type === "wall" ? wall : selected?.type === "door" ? door : null;

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <input
        aria-label="选中元素类型"
        readOnly
        style={inputStyle}
        value={getTypeValue(selected?.type ?? null)}
      />
      <input aria-label="选中元素编号" readOnly style={inputStyle} value={selected?.id ?? ""} />
      <input
        aria-label="起点X"
        onChange={(event) => {
          if (!camera) {
            return;
          }

          onCameraChange({ x: Number(event.target.value), y: camera.y });
        }}
        placeholder="x"
        readOnly={!camera}
        style={inputStyle}
        type="number"
        value={camera?.x ?? activeSegment?.start.x ?? ""}
      />
      <input
        aria-label="起点Y"
        onChange={(event) => {
          if (!camera) {
            return;
          }

          onCameraChange({ x: camera.x, y: Number(event.target.value) });
        }}
        placeholder="y"
        readOnly={!camera}
        style={inputStyle}
        type="number"
        value={camera?.y ?? activeSegment?.start.y ?? ""}
      />
      <input
        aria-label="终点X"
        readOnly
        style={inputStyle}
        value={camera ? "" : activeSegment?.end.x ?? ""}
      />
      <input
        aria-label="终点Y"
        readOnly
        style={inputStyle}
        value={camera ? "" : activeSegment?.end.y ?? ""}
      />
    </div>
  );
}
