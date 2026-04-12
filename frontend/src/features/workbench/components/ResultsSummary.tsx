interface ResultsSummaryProps {
  cameraCount: number;
  doorCount: number;
  pixelsPerMeter: number | null;
  wallCount: number;
}

const metricStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(19, 34, 56, 0.18)",
  padding: "10px 12px",
  background: "rgba(244, 247, 252, 0.95)"
} as const;

export function ResultsSummary({
  cameraCount,
  doorCount,
  pixelsPerMeter,
  wallCount
}: ResultsSummaryProps) {
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
      <input aria-label="墙体数量" readOnly style={metricStyle} value={wallCount} />
      <input aria-label="门洞数量" readOnly style={metricStyle} value={doorCount} />
      <input aria-label="相机数量" readOnly style={metricStyle} value={cameraCount} />
      <input aria-label="当前标定" readOnly style={metricStyle} value={pixelsPerMeter ?? ""} />
    </div>
  );
}
