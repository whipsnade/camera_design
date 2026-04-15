import type {
  CameraModeDto,
  DwgImportViewportDto,
  LayoutResultDto,
  PointDto,
  SegmentDto
} from "../types";

interface ExportPlanCamera {
  id: string;
  x: number;
  y: number;
  mode: CameraModeDto;
}

interface ExportPlanOptions {
  viewport: DwgImportViewportDto | null;
  walls: SegmentDto[];
  doors: SegmentDto[];
  cameras: ExportPlanCamera[];
  layoutResult: LayoutResultDto | null;
  width: number;
  height: number;
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

function collectPoints(options: ExportPlanOptions) {
  const points: PointDto[] = [];

  for (const segment of options.walls) {
    points.push(segment.start, segment.end);
  }

  for (const segment of options.doors) {
    points.push(segment.start, segment.end);
  }

  for (const camera of options.cameras) {
    points.push({ x: camera.x, y: camera.y });
  }

  for (const point of options.layoutResult?.blindSpots ?? []) {
    points.push(point);
  }

  for (const point of options.layoutResult?.overlapHints ?? []) {
    points.push(point);
  }

  return points;
}

function resolveViewport(options: ExportPlanOptions): DwgImportViewportDto {
  if (options.viewport) {
    return options.viewport;
  }

  const points = collectPoints(options);
  if (!points.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: options.width,
      maxY: options.height,
      width: options.width,
      height: options.height
    };
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return { minX, minY, maxX, maxY, width, height };
}


function buildSvg(options: ExportPlanOptions) {
  const viewport = resolveViewport(options);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}">`,
    `<rect x="${viewport.minX}" y="${viewport.minY}" width="${viewport.width}" height="${viewport.height}" fill="#ffffff" />`,
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
