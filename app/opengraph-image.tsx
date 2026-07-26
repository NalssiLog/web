import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "날씨로그 — 우리 동네 사람들이 직접 전하는 지금 날씨";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const icon = await readFile(join(process.cwd(), "public", "brand", "날씨로그_아이콘.png"));
  const iconDataUrl = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "linear-gradient(135deg, #eef9ff 0%, #d8f1ff 100%)",
          color: "#29495c",
          padding: "72px 88px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={iconDataUrl}
          style={{
            width: 390,
            height: 390,
            objectFit: "cover",
            borderRadius: 92,
            boxShadow: "0 24px 60px rgba(70, 143, 181, 0.2)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 540 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-3px" }}>날씨로그</div>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", fontSize: 29, fontWeight: 600, lineHeight: 1.45, color: "#52768a" }}>
            <span>우리 동네 사람들이 직접 전하는</span>
            <span>지금 날씨</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
