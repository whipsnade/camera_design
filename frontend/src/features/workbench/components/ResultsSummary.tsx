interface ResultsSummaryProps {
  cameraCount: number;
  coverageRatio: number | null;
  doorCount: number;
  overlapHintCount: number;
  pixelsPerMeter: number | null;
  recommendedCameraCount: number | null;
  blindSpotCount: number;
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
  coverageRatio,
  doorCount,
  overlapHintCount,
  pixelsPerMeter,
  recommendedCameraCount,
  blindSpotCount,
  wallCount
}: ResultsSummaryProps) {
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
      <input aria-label="墙体数量" readOnly style={metricStyle} value={wallCount} />
      <input aria-label="门洞数量" readOnly style={metricStyle} value={doorCount} />
      <input aria-label="相机数量" readOnly style={metricStyle} value={cameraCount} />
      <input aria-label="当前标定" readOnly style={metricStyle} value={pixelsPerMeter ?? ""} />
      <input
        aria-label="建议摄像头数量"
        readOnly
        style={metricStyle}
        value={recommendedCameraCount ?? ""}
      />
      <input
        aria-label="覆盖率"
        readOnly
        style={metricStyle}
        value={coverageRatio === null ? "" : `${(coverageRatio * 100).toFixed(1)}%`}
      />
      <input aria-label="盲区数量" readOnly style={metricStyle} value={blindSpotCount} />
      <input aria-label="重叠提示数量" readOnly style={metricStyle} value={overlapHintCount} />
    </div>
  );
}
