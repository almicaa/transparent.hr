import { ImageResponse } from "next/og"
import { getJob } from "../../../../lib/api"
import { Locale } from "../../../../lib/i18n"
import { jobSalaryText } from "../../../../lib/seo"

export const runtime = "edge"
export const alt = "Oglas za posao — Transparent.hr"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { lang: Locale; id: string } }) {
  const locale = params.lang === "en" ? "en" : "hr"
  const job = /^\d+$/.test(params.id) ? await getJob(params.id).catch(() => null) : null

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
            fontSize: 32,
            fontWeight: 700,
            color: "#1D9E9E",
            marginBottom: 32,
          }}
        >
          Transparent.hr
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: "#085050",
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {job?.title || (locale === "en" ? "Job ad" : "Oglas za posao")}
        </div>
        {job?.company ? (
          <div style={{ display: "flex", fontSize: 32, color: "#2b2f2e", marginTop: 24 }}>{job.company}</div>
        ) : null}
        {job && jobSalaryText(job, locale) ? (
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: "#ffffff",
              background: "#085050",
              padding: "12px 24px",
              borderRadius: 12,
              marginTop: 32,
            }}
          >
            {jobSalaryText(job, locale)}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  )
}
