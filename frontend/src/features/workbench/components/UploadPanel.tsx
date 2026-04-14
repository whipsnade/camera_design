import type { ChangeEvent } from "react";

import type { UploadAsset } from "../state/projectReducer";

interface UploadPanelProps {
  confidenceItemCount: number;
  recognitionStatus: "idle" | "loading" | "ready" | "error";
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

function recognitionLabel(status: UploadPanelProps["recognitionStatus"]) {
  if (status === "loading") {
    return "识别中";
  }

  if (status === "ready") {
    return "已识别";
  }

  if (status === "error") {
    return "识别失败";
  }

  return "";
}

export function UploadPanel({
  confidenceItemCount,
  recognitionStatus,
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
        aria-label="上传图纸文件"
        accept="image/*,application/pdf"
        onChange={handleChange}
        style={fieldStyle}
        type="file"
      />
      <input
        aria-label="当前图纸文件"
        placeholder="未选择图纸"
        readOnly
        style={fieldStyle}
        value={upload?.name ?? ""}
      />
      <input
        aria-label="识别状态"
        placeholder="未开始识别"
        readOnly
        style={fieldStyle}
        value={recognitionLabel(recognitionStatus)}
      />
      <input
        aria-label="待确认项数量"
        readOnly
        style={fieldStyle}
        value={confidenceItemCount}
      />
    </div>
  );
}
