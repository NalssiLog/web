const MAX_IMAGE_EDGE = 2048;
const OUTPUT_QUALITY = 0.86;

function replaceExtension(name: string, type: string) {
  const extension = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  return `${name.replace(/\.[^.]+$/, "") || "weather"}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("사진을 최적화하지 못했어요.")),
      type,
      type === "image/png" ? undefined : OUTPUT_QUALITY,
    );
  });
}

export async function optimizeReportImage(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 최적화하지 못했어요.");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, file.type);
    if (blob.size >= file.size) return file;
    return new File([blob], replaceExtension(file.name, blob.type), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
