const MAX_IMAGE_EDGE = 2048;
const OUTPUT_QUALITY = 0.86;
const AVATAR_EDGE = 512;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

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

export async function optimizeAvatarImage(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const cropSize = Math.min(bitmap.width, bitmap.height);
    const sourceX = Math.round((bitmap.width - cropSize) / 2);
    const sourceY = Math.round((bitmap.height - cropSize) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_EDGE;
    canvas.height = AVATAR_EDGE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("프로필 사진을 준비하지 못했어요.");
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_EDGE,
      AVATAR_EDGE,
    );

    const blob = await canvasToBlob(canvas, "image/webp");
    if (blob.size > MAX_AVATAR_SIZE) {
      throw new Error("프로필 사진을 2MB 이하로 줄이지 못했어요.");
    }
    const outputType = blob.type || "image/webp";
    return new File([blob], replaceExtension(file.name, outputType), {
      type: outputType,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
