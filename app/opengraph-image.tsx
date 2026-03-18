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
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#2563EB",
          }}
        />

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
            viewBox="0 0 512 512"
            fill="none"
          >
            <g transform="translate(256,256)">
              <path d="M-8,-8 C-8,-80 -80,-80 -80,-8 Z" fill="#111111"/>
              <path d="M-8,8 C-8,80 -80,80 -80,8 Z" fill="#111111"/>
              <circle cx="44" cy="-44" r="36" fill="#2563EB"/>
              <path d="M8,8 C8,80 80,80 80,8 Z" fill="#111111"/>
            </g>
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
