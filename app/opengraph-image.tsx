import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TradeControl trading journal and risk dashboard";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#06080c",
          color: "white",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%"
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.24), rgba(15,23,42,0.96))",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 42,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: 56,
            width: "100%"
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <div
              style={{
                alignItems: "center",
                background: "#34d399",
                borderRadius: 18,
                color: "#020617",
                display: "flex",
                fontSize: 32,
                fontWeight: 800,
                height: 64,
                justifyContent: "center",
                width: 64
              }}
            >
              T
            </div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>TradeControl</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#6ee7b7", fontSize: 26, fontWeight: 700, marginBottom: 18 }}>
              Trading journal. Risk manager. AI coach.
            </div>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 0, lineHeight: 1.04, maxWidth: 920 }}>
              Master your trading discipline.
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 30, lineHeight: 1.35, marginTop: 26, maxWidth: 900 }}>
              Track trades, review emotions, control risk, and improve your process in one professional dashboard.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
