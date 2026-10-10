"use client"

import { trackEvent } from "../../lib/analytics"
import { isSaved, toggleSaved, useSavedJobs } from "../../lib/savedJobs"
import { Job } from "../../lib/types"

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.7 1.2-1.6 2.8-2.7 4.8-2.7 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Heart toggle for saving a job in this browser; `withLabel` adds "Spremi oglas" text. */
export default function SaveButton({ job, withLabel = false }: { job: Job; withLabel?: boolean }) {
  const saved = isSaved(useSavedJobs(), job.id)

  return (
    <button
      type="button"
      className={`save-button${withLabel ? " save-button--label" : ""}${saved ? " is-saved" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? "Ukloni iz spremljenih" : "Spremi oglas"}
      title={saved ? "Ukloni iz spremljenih" : "Spremi oglas"}
      onClick={(e) => {
        // On a card the title link covers the whole card; don't navigate.
        e.preventDefault()
        e.stopPropagation()
        const nowSaved = toggleSaved(job)
        trackEvent(nowSaved ? "save_job" : "unsave_job", { job_id: job.id, category: job.category ?? undefined })
      }}
    >
      <HeartIcon filled={saved} />
      {withLabel ? <span>{saved ? "Spremljeno" : "Spremi oglas"}</span> : null}
    </button>
  )
}
