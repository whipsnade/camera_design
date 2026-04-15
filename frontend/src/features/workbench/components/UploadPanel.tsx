import type { ChangeEvent } from "react";

import type { UploadAsset } from "../state/projectReducer";

interface UploadPanelProps {
  importStatus: "idle" | "loading" | "ready" | "error";
  importMessage: string | null;
  importWarningCount: number;
  upload: UploadAsset | null;
  onUpload: (file: File) => void;
}

const fieldStyle = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid rgba(19, 34, 56, 0.18)",
  padding: "10px 12px",
  background: "rgba(244, 247, 252, 0.95)"
} as const;

function importLabel(status: UploadPanelProps["importStatus"], message: string | null) {
  if (status === "loading") {
    return "导入中";
  }

  if (status === "ready") {
    return "已导入";
  }

  if (status === "error") {
    return message ? `导入失败：${message}` : "导入失败";
  }

  return "";
}

export function UploadPanel({
  importStatus,
  importMessage,
  importWarningCount,
  upload,
  onUpload
}: UploadPanelProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onUpload(file);
    event.target.value = "";
  };

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
      <input
        aria-label="上传DWG文件"
        accept=".dwg,application/acad,application/x-acad"
        onChange={handleChange}
        style={fieldStyle}
        type="file"
      />
      <input
        aria-label="当前DWG文件"
        placeholder="未选择DWG"
        readOnly
        style={fieldStyle}
        value={upload?.name ?? ""}
      />
      <input
        aria-label="导入状态"
        placeholder="未开始导入"
        readOnly
        style={fieldStyle}
        value={importLabel(importStatus, importMessage)}
      />
      <input
        aria-label="导入警告数量"
        readOnly
        style={fieldStyle}
        value={importWarningCount}
      />
      <div style={{ fontSize: 13, color: "rgba(19, 34, 56, 0.68)" }}>仅支持 DWG 文件导入</div>
    </div>
  );
}
