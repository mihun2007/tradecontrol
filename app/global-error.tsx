"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  return (
    <html lang="en">
      <body>
        <main style={{ alignItems: "center", background: "#06080c", color: "#f8fafc", display: "flex", minHeight: "100vh", justifyContent: "center", padding: 24 }}>
          <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 28, maxWidth: 520, padding: 28, textAlign: "center" }}>
            <AlertTriangle aria-hidden="true" />
            <h1>TradeControl could not load.</h1>
            <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
              A critical app error occurred. Refresh the page, then try again.
            </p>
            <button onClick={reset} style={{ border: 0, borderRadius: 16, cursor: "pointer", fontWeight: 700, marginTop: 16, padding: "12px 18px" }} type="button">
              Try Again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
