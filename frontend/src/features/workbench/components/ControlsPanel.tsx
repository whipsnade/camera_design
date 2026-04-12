import type { DrawMode } from "../state/projectReducer";

interface ControlsPanelProps {
  activeMode: DrawMode;
  hasSelection: boolean;
  pixelsPerMeter: number | null;
  onDeleteSelected: () => void;
  onModeChange: (mode: DrawMode) => void;
  onScaleChange: (value: number) => void;
}

const iconButtonStyle = (active: boolean, color: string) =>
  ({
    width: 42,
    height: 42,
    borderRadius: 14,
    border: active ? "2px solid rgba(19, 34, 56, 0.78)" : "1px solid rgba(19, 34, 56, 0.18)",
    background: color,
    boxShadow: active ? "0 10px 24px rgba(19, 34, 56, 0.16)" : "none",
    cursor: "pointer"
  }) as const;

export function ControlsPanel({
  activeMode,
  hasSelection,
  pixelsPerMeter,
  onDeleteSelected,
  onModeChange,
  onScaleChange
}: ControlsPanelProps) {
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <input
        aria-label="手工标定像素每米"
        min={1}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value > 0) {
            onScaleChange(value);
          }
        }}
        placeholder="px/m"
        step={1}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid rgba(19, 34, 56, 0.18)",
          padding: "10px 12px",
          background: "rgba(244, 247, 252, 0.95)"
        }}
        type="number"
        value={pixelsPerMeter ?? ""}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          aria-label="选择模式"
          onClick={() => onModeChange("select")}
          style={iconButtonStyle(activeMode === "select", "linear-gradient(135deg, #dce6f7, #f4f7fc)")}
          title="选择模式"
          type="button"
        />
        <button
          aria-label="墙体模式"
          onClick={() => onModeChange("wall")}
          style={iconButtonStyle(activeMode === "wall", "linear-gradient(135deg, #a8c7ff, #e5efff)")}
          title="墙体模式"
          type="button"
        />
        <button
          aria-label="门洞模式"
          onClick={() => onModeChange("door")}
          style={iconButtonStyle(activeMode === "door", "linear-gradient(135deg, #ffd3a6, #fff1de)")}
          title="门洞模式"
          type="button"
        />
        <button
          aria-label="相机模式"
          onClick={() => onModeChange("camera")}
          style={iconButtonStyle(activeMode === "camera", "linear-gradient(135deg, #9ae0cb, #e0fff5)")}
          title="相机模式"
          type="button"
        />
        <button
          aria-label="删除选中元素"
          disabled={!hasSelection}
          onClick={onDeleteSelected}
          style={{
            ...iconButtonStyle(false, "linear-gradient(135deg, #ffd2d7, #fff1f3)"),
            opacity: hasSelection ? 1 : 0.45
          }}
          title="删除选中元素"
          type="button"
        />
      </div>
    </div>
  );
}
