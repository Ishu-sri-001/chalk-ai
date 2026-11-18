"use client";

export default function GlobalError({ retry }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f6f8fb",
          color: "#0f1b2d",
        }}
      >
        <title>ChalkAI: something went wrong</title>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 30, fontWeight: 500, fontFamily: "system-ui, sans-serif", margin: "0 0 8px" }}>Chalk couldn&apos;t load</h1>
          <p style={{ color: "#5b6779", lineHeight: 1.5 }}>
            An unexpected error stopped the page from loading. Reloading usually fixes it.
          </p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              borderRadius: 999,
              border: 0,
              background: "#2d5f9a",
              color: "#ffffff",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
