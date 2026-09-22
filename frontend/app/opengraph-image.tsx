import { ImageResponse } from "next/og"

export const alt = "Transparent.hr — Oglasi za posao s transparentnom plaćom"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "#fafbfa",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 700,
            color: "#1D9E9E",
            marginBottom: 24,
          }}
        >
          Transparent.hr
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#085050",
            lineHeight: 1.15,
            maxWidth: 960,
          }}
        >
          Oglasi za posao s transparentnom plaćom
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#2b2f2e",
            marginTop: 32,
          }}
        >
          Samo oglasi s vidljivom neto ili bruto plaćom u EUR
        </div>
      </div>
    ),
    { ...size }
  )
}
