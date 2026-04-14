import type { ExportBundleDto } from "../types";

interface ResultsSummaryProps {
  cameraCount: number;
  coverageRatio: number | null;
  doorCount: number;
  exportBundle: ExportBundleDto | null;
  exportStatus: "idle" | "exporting" | "done" | "error";
  overlapHintCount: number;
  pixelsPerMeter: number | null;
  recommendedCameraCount: number | null;
  blindSpotCount: number;
  wallCount: number;
  onExport: () => void;
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
  exportBundle,
  exportStatus,
  overlapHintCount,
  pixelsPerMeter,
  recommendedCameraCount,
  blindSpotCount,
  wallCount,
  onExport
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
      <button
        aria-label="导出成果"
        onClick={onExport}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid rgba(19, 34, 56, 0.18)",
          padding: "10px 12px",
          background: "linear-gradient(135deg, #ffd166, #f59e0b)",
          color: "#132238",
          fontWeight: 700,
          cursor: exportStatus === "exporting" ? "progress" : "pointer",
          opacity: exportStatus === "exporting" ? 0.8 : 1
        }}
        type="button"
      >
        {exportStatus === "exporting" ? "导出中..." : "导出成果"}
      </button>
      <input
        aria-label="导出状态"
        readOnly
        style={metricStyle}
        value={
          exportStatus === "done"
            ? "导出完成"
            : exportStatus === "error"
              ? "导出失败"
              : exportStatus === "exporting"
                ? "正在导出"
                : ""
        }
      />
      <input
        aria-label="导出PDF路径"
        readOnly
        style={metricStyle}
        value={exportBundle?.pdfPath ?? ""}
      />
    </div>
  );
}
