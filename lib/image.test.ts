import { describe, expect, it } from "vitest";
import { isSupportedAvatarSource, normalizeSelectedImage } from "@/lib/image";

describe("normalizeSelectedImage", () => {
  it("빈 MIME 타입을 파일 확장자로 복구한다", () => {
    const source = new File(["image"], "album-photo.JPEG");

    const normalized = normalizeSelectedImage(source);

    expect(normalized.type).toBe("image/jpeg");
    expect(normalized.name).toBe(source.name);
    expect(normalized.lastModified).toBe(source.lastModified);
  });

  it("일부 모바일 브라우저의 image/jpg 타입을 표준 타입으로 바꾼다", () => {
    const source = new File(["image"], "album-photo.jpg", { type: "image/jpg" });

    expect(normalizeSelectedImage(source).type).toBe("image/jpeg");
  });

  it("앨범의 HEIC와 HEIF 파일을 프로필 원본으로 허용한다", () => {
    const heic = normalizeSelectedImage(new File(["image"], "photo.heic"));
    const heif = normalizeSelectedImage(new File(["image"], "photo.heif"));

    expect(isSupportedAvatarSource(heic)).toBe(true);
    expect(isSupportedAvatarSource(heif)).toBe(true);
  });

  it("벡터 이미지는 프로필 원본으로 허용하지 않는다", () => {
    const source = new File(["svg"], "profile.svg", { type: "image/svg+xml" });

    expect(isSupportedAvatarSource(source)).toBe(false);
  });
});
