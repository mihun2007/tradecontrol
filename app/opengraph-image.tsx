import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TradeControl — Trading Journal and AI Risk Desk";
export const size = {
  height: 630,
  width: 1200
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          padding: 64,
          position: "relative",
          width: "100%"
        }}
      >
        <div
          style={{
            background: "radial-gradient(circle, rgba(34,197,94,0.36) 0%, rgba(34,197,94,0.14) 34%, rgba(34,197,94,0) 68%)",
            borderRadius: "999px",
            filter: "blur(12px)",
            height: 520,
            position: "absolute",
            right: -130,
            top: -170,
            width: 520
          }}
        />
        <div
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(10,10,10,0) 48%)",
            inset: 0,
            position: "absolute"
          }}
        />
        <div
          style={{
            alignItems: "flex-start",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 40,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: 48,
            position: "relative",
            width: "100%"
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
            TradeControl
          </div>

          <div style={{ alignItems: "center", display: "flex", flexDirection: "column", textAlign: "center", width: "100%" }}>
            <div style={{ color: "#ffffff", fontSize: 56, fontWeight: 800, letterSpacing: 0, lineHeight: 1.08 }}>
              Trading Journal &amp; AI Risk Desk
            </div>
            <div style={{ color: "#888888", fontSize: 24, fontWeight: 600, lineHeight: 1.35, marginTop: 22 }}>
              Track trades. Analyze performance. Get AI coaching.
            </div>
          </div>

          <div style={{ alignItems: "flex-end", display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <div
              style={{
                background: "#22c55e",
                borderRadius: 999,
                color: "#06110a",
                fontSize: 20,
                fontWeight: 800,
                padding: "12px 22px"
              }}
            >
              Free to start
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
