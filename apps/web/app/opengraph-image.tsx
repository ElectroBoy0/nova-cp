import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "NovaCP — The Modern Competitive Programming Command Center"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#090A0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Glow gradients */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "200px",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Top bar: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #A855F7, #6366F1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            N
          </div>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.03em" }}>
            NovaCP
          </span>
          <div
            style={{
              marginLeft: "12px",
              padding: "4px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(168,85,247,0.4)",
              background: "rgba(168,85,247,0.15)",
              color: "#C084FC",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            v1.0 Production
          </div>
        </div>

        {/* Main Hero Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            The Modern OS for Competitive Programmers.
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#94A3B8",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Monaco Workspace IDE • Codeforces Live Sync • KaTeX Statements • AI Practice Coach • Contest Hub
          </p>
        </div>

        {/* Feature Pills Footer */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#E2E8F0",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#A855F7" }}>&gt;_</span> Monaco IDE Sandbox
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#E2E8F0",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#38BDF8" }}>✦</span> AI Socratic Hints
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#E2E8F0",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#F59E0B" }}>★</span> Real-time Rating Analytics
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
