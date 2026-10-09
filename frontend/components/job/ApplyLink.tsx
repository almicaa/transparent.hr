"use client"

import { trackEvent } from "../../lib/analytics"

/** Link to the original ad on the source portal; counted as an "apply_click" in GA. */
export default function ApplyLink({ href, jobId, source, category }: { href: string; jobId: number; source: string | null; category: string | null }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("apply_click", { job_id: jobId, source: source ?? undefined, category: category ?? undefined })}
    >
      Pogledaj originalni oglas →
    </a>
  )
}
