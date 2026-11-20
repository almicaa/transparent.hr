"use client"

import { trackEvent } from "../../lib/analytics"
import { outboundUrl } from "../../lib/outboundUrl"
import { useLocale } from "../i18n/LocaleProvider"

/** Link to the original ad on the source portal; counted as an "apply_click" in GA.
 *  The portal goes in job_source, not source: GA reads an event parameter named
 *  source as the session's traffic source. */
export default function ApplyLink({ href, jobId, source, category }: { href: string; jobId: number; source: string | null; category: string | null }) {
  const locale = useLocale()
  return (
    <a
      href={outboundUrl(href)}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("apply_click", { job_id: jobId, job_source: source ?? undefined, category: category ?? undefined })}
    >
      {locale === "en" ? "See the original ad →" : "Pogledaj originalni oglas →"}
    </a>
  )
}
