const MAX_IMAGE_EDGE = 2048;
const OUTPUT_QUALITY = 0.86;
const AVATAR_EDGE = 512;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const IMAGE_TYPE_BY_EXTENSION: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
  jfif: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

export function normalizeSelectedImage(file: File) {
  const declaredType = file.type.trim().toLowerCase();
  const normalizedDeclaredType = declaredType === "image/jpg" ? "image/jpeg" : declaredType;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const inferredType = IMAGE_TYPE_BY_EXTENSION[extension] ?? "";
  const normalizedType = normalizedDeclaredType.startsWith("image/")
    ? normalizedDeclaredType
    : inferredType;

  if (!normalizedType || normalizedType === file.type) return file;
  return new File([file], file.name, {
    type: normalizedType,
    lastModified: file.lastModified,
  });
}

export function isSupportedAvatarSource(file: File) {
  return AVATAR_SOURCE_TYPES.has(file.type.trim().toLowerCase());
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // 일부 인앱브라우저는 API를 노출하면서도 앨범 파일 디코딩에 실패한다.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("선택한 사진을 불러오지 못했어요."));
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

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
  const image = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 최적화하지 못했어요.");
    context.drawImage(image.source, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, file.type);
    if (blob.size >= file.size) return file;
    return new File([blob], replaceExtension(file.name, blob.type), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    image.dispose();
  }
}

export async function optimizeAvatarImage(file: File) {
  const image = await decodeImage(file);
  try {
    const cropSize = Math.min(image.width, image.height);
    const sourceX = Math.round((image.width - cropSize) / 2);
    const sourceY = Math.round((image.height - cropSize) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_EDGE;
    canvas.height = AVATAR_EDGE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("프로필 사진을 준비하지 못했어요.");
    context.drawImage(
      image.source,
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
    image.dispose();
  }
}
