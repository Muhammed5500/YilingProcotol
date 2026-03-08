import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Yiling Protocol — Oracle-Free Prediction Markets Live on Base";
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
            background: "linear-gradient(90deg, #ea580c, #0052FF)",
          }}
        />

        {/* Dice icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: "#ea580c",
            marginBottom: 32,
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="4" />
            <circle cx="7" cy="7" r="1.5" fill="white" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="white" stroke="none" />
            <circle cx="17" cy="17" r="1.5" fill="white" stroke="none" />
            <circle cx="17" cy="7" r="1.5" fill="white" stroke="none" />
            <circle cx="7" cy="17" r="1.5" fill="white" stroke="none" />
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
          Oracle-Free Prediction Markets
        </div>

        {/* Base badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 24px",
            borderRadius: 999,
            backgroundColor: "#0052FF",
            color: "white",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="10" fill="white" />
            <path
              d="M12 6a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8V8z"
              fill="#0052FF"
            />
          </svg>
          Live on Base
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
          SELF-RESOLVING · GAME THEORY · HARVARD SKC MECHANISM
        </div>
      </div>
    ),
    { ...size }
  );
}
