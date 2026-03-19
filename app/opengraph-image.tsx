import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Yiling Protocol — Oracle-Free Truth Discovery Infrastructure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Petal Cluster Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            gap: 4,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="176 176 160 160"
            fill="none"
          >
            <path d="M248,248 C248,176 176,176 176,248 Z" fill="#111111"/>
            <path d="M248,264 C248,336 176,336 176,264 Z" fill="#111111"/>
            <circle cx="300" cy="212" r="36" fill="#2563EB"/>
            <path d="M264,264 C264,336 336,336 336,264 Z" fill="#111111"/>
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#171717",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          Yiling Protocol
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "#525252",
            marginBottom: 32,
          }}
        >
          Oracle-Free Truth Discovery Infrastructure
        </div>

        {/* Monad badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 24px",
            borderRadius: 999,
            backgroundColor: "#2563EB",
            color: "white",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Live on Monad
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 16,
            color: "#a3a3a3",
            letterSpacing: "0.1em",
          }}
        >
          SELF-RESOLVING · GAME THEORY · TRUTH RESOLVES ITSELF
        </div>
      </div>
    ),
    { ...size }
  );
}
