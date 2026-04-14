import type { CameraModeDto, LayoutResultDto, PointDto, SegmentDto } from "../types";


interface ExportUploadAsset {
  kind: "image" | "pdf";
  url: string;
}

interface ExportPlanCamera {
  id: string;
  x: number;
  y: number;
  mode: CameraModeDto;
}

interface ExportPlanOptions {
  upload: ExportUploadAsset | null;
  walls: SegmentDto[];
  doors: SegmentDto[];
  cameras: ExportPlanCamera[];
  layoutResult: LayoutResultDto | null;
  width: number;
  height: number;
}


function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


function labelMap(cameras: ExportPlanCamera[]) {
  return new Map(cameras.map((camera, index) => [camera.id, `CAM-${String(index + 1).padStart(2, "0")}`]));
}


function segmentMarkup(segments: SegmentDto[], stroke: string) {
  return segments
    .map(
      (segment) =>
        `<line x1="${segment.start.x}" y1="${segment.start.y}" x2="${segment.end.x}" y2="${segment.end.y}" stroke="${stroke}" stroke-width="8" stroke-linecap="round" />`
    )
    .join("");
}


function polygonMarkup(layoutResult: LayoutResultDto | null) {
  if (!layoutResult) {
    return "";
  }

  return layoutResult.cameras
    .map((camera) => {
      const fill = camera.mode === "panoramic" ? "rgba(45,91,255,0.12)" : "rgba(20,184,166,0.16)";
      const stroke = camera.mode === "panoramic" ? "rgba(45,91,255,0.35)" : "rgba(20,184,166,0.45)";
      const points = camera.coveragePolygon.map((point) => `${point.x},${point.y}`).join(" ");
      return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
    })
    .join("");
}


function pointCloudMarkup(points: PointDto[], fill: string) {
  return points
    .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${fill}" />`)
    .join("");
}


function cameraMarkup(cameras: ExportPlanCamera[]) {
  const labels = labelMap(cameras);

  return cameras
    .map((camera) => {
      const label = labels.get(camera.id) ?? camera.id;
      return [
        `<circle cx="${camera.x}" cy="${camera.y}" r="18" fill="#14b8a6" stroke="#ecfeff" stroke-width="4" />`,
        `<text x="${camera.x + 24}" y="${camera.y + 6}" font-size="18" font-family="Arial, sans-serif" fill="#132238">${label}</text>`
      ].join("");
    })
    .join("");
}


function buildSvg(options: ExportPlanOptions) {
  const background =
    options.upload?.kind === "image"
      ? `<image href="${escapeXml(options.upload.url)}" x="0" y="0" width="${options.width}" height="${options.height}" preserveAspectRatio="xMidYMid meet" />`
      : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">`,
    `<rect width="${options.width}" height="${options.height}" fill="#ffffff" />`,
    background,
    polygonMarkup(options.layoutResult),
    pointCloudMarkup(options.layoutResult?.blindSpots ?? [], "rgba(220,38,38,0.88)"),
    pointCloudMarkup(options.layoutResult?.overlapHints ?? [], "rgba(245,158,11,0.82)"),
    segmentMarkup(options.walls, "#1f2937"),
    segmentMarkup(options.doors, "#f59e0b"),
    cameraMarkup(options.cameras),
    "</svg>"
  ].join("");
}


function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load export image"));
    image.src = url;
  });
}


function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to create export blob"));
    }, "image/png");
  });
}


export async function exportPlanImage(options: ExportPlanOptions): Promise<Blob> {
  const svgMarkup = buildSvg(options);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = options.width;
    canvas.height = options.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    context.drawImage(image, 0, 0, options.width, options.height);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
