import type { ChangeEvent } from "react";

import type { UploadAsset } from "../state/projectReducer";

interface UploadPanelProps {
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

export function UploadPanel({ upload, onUpload }: UploadPanelProps) {
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
    </div>
  );
}
