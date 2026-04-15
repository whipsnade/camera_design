import type { DrawMode } from "../state/projectReducer";

interface ControlsPanelProps {
  activeMode: DrawMode;
  coverageDistanceM: number;
  fieldOfViewDeg: number;
  rayCount: number;
  hasSelection: boolean;
  hasRegionPolygon: boolean;
  regionDraftPointCount: number;
  layoutStatus: "idle" | "loading" | "ready" | "error";
  unitsPerMeter: number | null;
  onCoverageDistanceChange: (value: number) => void;
  onDeleteSelected: () => void;
  onModeChange: (mode: DrawMode) => void;
  onRecalculate: () => void;
  onScaleChange: (value: number) => void;
  onFieldOfViewChange: (value: number) => void;
  onRayCountChange: (value: number) => void;
  onConfirmRegion: () => void;
  onClearRegion: () => void;
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
  coverageDistanceM,
  fieldOfViewDeg,
  rayCount,
  hasSelection,
  hasRegionPolygon,
  regionDraftPointCount,
  layoutStatus,
  unitsPerMeter,
  onCoverageDistanceChange,
  onDeleteSelected,
  onModeChange,
  onRecalculate,
  onScaleChange,
  onFieldOfViewChange,
  onRayCountChange,
  onConfirmRegion,
  onClearRegion
}: ControlsPanelProps) {
  const canRecalculate = Boolean(unitsPerMeter) && layoutStatus !== "loading" && hasRegionPolygon;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <div style={{ fontSize: 11, color: "rgba(19, 34, 56, 0.6)" }}>图纸单位/米</div>
      <input
        aria-label="手工标定图纸单位每米"
        min={1}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value > 0) {
            onScaleChange(value);
          }
        }}
        placeholder="units/m"
        step={1}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid rgba(19, 34, 56, 0.18)",
          padding: "10px 12px",
          background: "rgba(244, 247, 252, 0.95)"
        }}
        type="number"
        value={unitsPerMeter ?? ""}
      />
      <div style={{ fontSize: 11, color: "rgba(19, 34, 56, 0.6)" }}>覆盖距离</div>
      <input
        aria-label="覆盖距离滑块"
        max={20}
        min={1}
        onChange={(event) => {
          onCoverageDistanceChange(Number(event.target.value));
        }}
        step={0.5}
        type="range"
        value={coverageDistanceM}
      />
      <input
        aria-label="覆盖距离数值"
        readOnly
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid rgba(19, 34, 56, 0.18)",
          padding: "10px 12px",
          background: "rgba(244, 247, 252, 0.95)"
        }}
        value={`${coverageDistanceM} m`}
      />
      <div style={{ fontSize: 11, color: "rgba(19, 34, 56, 0.6)", marginTop: 4 }}>
        视场角: {fieldOfViewDeg}°
      </div>
      <input
        aria-label="视场角滑块"
        max={180}
        min={30}
        onChange={(event) => {
          onFieldOfViewChange(Number(event.target.value));
        }}
        step={10}
        type="range"
        value={fieldOfViewDeg}
      />
      <div style={{ fontSize: 11, color: "rgba(19, 34, 56, 0.6)", marginTop: 4 }}>
        射线数量: {rayCount}
      </div>
      <input
        aria-label="射线数量滑块"
        max={32}
        min={8}
        onChange={(event) => {
          onRayCountChange(Number(event.target.value));
        }}
        step={2}
        type="range"
        value={rayCount}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          aria-label="区域模式"
          onClick={() => onModeChange("region")}
          style={iconButtonStyle(activeMode === "region", "linear-gradient(135deg, #a5b4fc, #e0e7ff)")}
          title="区域模式"
          type="button"
        />
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
      {/* Region confirm/clear buttons */}
      {regionDraftPointCount >= 3 && !hasRegionPolygon && (
        <button
          aria-label="确认区域"
          onClick={onConfirmRegion}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid rgba(99, 102, 241, 0.4)",
            padding: "10px 12px",
            background: "rgba(99, 102, 241, 0.92)",
            color: "#f8fafc",
            cursor: "pointer"
          }}
          type="button"
        >
          确认区域
        </button>
      )}
      {hasRegionPolygon && (
        <button
          aria-label="清除区域"
          onClick={onClearRegion}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid rgba(220, 38, 38, 0.3)",
            padding: "10px 12px",
            background: "rgba(254, 226, 226, 0.95)",
            color: "rgba(153, 27, 27, 0.9)",
            cursor: "pointer"
          }}
          type="button"
        >
          清除区域
        </button>
      )}
      <button
        aria-label="重新计算"
        disabled={!canRecalculate}
        onClick={onRecalculate}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid rgba(19, 34, 56, 0.18)",
          padding: "10px 12px",
          background: "rgba(19, 34, 56, 0.92)",
          color: "#f8fafc",
          cursor: canRecalculate ? "pointer" : "not-allowed",
          opacity: canRecalculate ? 1 : 0.55
        }}
        type="button"
      >
        重新计算
      </button>
    </div>
  );
}
