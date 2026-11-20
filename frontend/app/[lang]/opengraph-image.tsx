import { ImageResponse } from "next/og"

import { Locale } from "../../lib/i18n"

export const alt = "Transparent.hr — Oglasi za posao s transparentnom plaćom"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const COPY = {
  hr: {
    title: "Oglasi za posao s transparentnom plaćom",
    subtitle: "Samo oglasi s vidljivom neto ili bruto plaćom u EUR",
  },
  en: {
    title: "Jobs in Croatia with the salary up front",
    subtitle: "Only ads that show their net or gross pay in euros",
  },
}

export default function Image({ params }: { params: { lang: Locale } }) {
  const t = COPY[params.lang] ?? COPY.hr
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
          {t.title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#2b2f2e",
            marginTop: 32,
          }}
        >
          {t.subtitle}
        </div>
      </div>
    ),
    { ...size }
  )
}
