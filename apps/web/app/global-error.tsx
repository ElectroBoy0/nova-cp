"use client"

import React from "react"

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0A0A0F",
          color: "#F8FAFC",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: "440px", padding: "32px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: "9999px",
              backgroundColor: "rgba(244, 63, 94, 0.1)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Critical System Error
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 12px 0", color: "#FFFFFF" }}>
            NovaCP encountered an issue
          </h1>
          <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 24px 0", lineHeight: "1.5" }}>
            A fatal layout error occurred. Click below to reload the workspace.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              backgroundColor: "#7C3AED",
              color: "#FFFFFF",
              border: "none",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reload Workspace
          </button>
        </div>
      </body>
    </html>
  )
}

