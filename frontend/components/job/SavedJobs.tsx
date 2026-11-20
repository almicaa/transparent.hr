"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import JobCard from "./JobCard"
import { getJob } from "../../lib/api"
import { removeSaved, updateSaved, useSavedJobs } from "../../lib/savedJobs"
import { jobCountLabel } from "../../lib/format"
import { localePath } from "../../lib/i18n"
import { useLocale } from "../i18n/LocaleProvider"

const COPY = {
  hr: {
    emptyStart: "Još nemaš spremljenih oglasa. Klikni na",
    emptyEnd: "na oglasu koji ti se sviđa i naći ćeš ga ovdje.",
    browse: "Pregledaj oglase →",
    expired: "Istekli oglasi",
    removeExpired: "Ukloni sve istekle",
    remove: "Ukloni",
  },
  en: {
    emptyStart: "You haven't saved any jobs yet. Tap the",
    emptyEnd: "on a job you like and you'll find it here.",
    browse: "Browse jobs →",
    expired: "Expired jobs",
    removeExpired: "Remove all expired",
    remove: "Remove",
  },
}

/** The saved list: still-open jobs as cards, expired ones in a short list below. */
export default function SavedJobs() {
  const locale = useLocale()
  const t = COPY[locale]
  const saved = useSavedJobs()
  // Ids the API no longer serves (expired or removed); null until checked.
  const [expired, setExpired] = useState<Set<number> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Check each saved job once per visit and refresh its snapshot.
  const ids = saved.map((j) => j.id).join(",")
  useEffect(() => {
    if (!ids) return
    let cancelled = false
    Promise.all(
      ids.split(",").map((id) =>
        getJob(id)
          .then((job) => ({ id: Number(id), job }))
          // A network error isn't proof the ad is gone; keep it as open.
          .catch(() => ({ id: Number(id), job: undefined })),
      ),
    ).then((results) => {
      if (cancelled) return
      setExpired(new Set(results.filter((r) => r.job === null).map((r) => r.id)))
      updateSaved(results.flatMap((r) => (r.job ? [r.job] : [])))
    })
    return () => {
      cancelled = true
    }
    // Re-check only when the set of ids changes, not on snapshot refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  // Storage is only readable in the browser; avoid flashing the empty state.
  if (!mounted) return null

  if (saved.length === 0) {
    return (
      <div className="saved-empty">
        <p>
          {t.emptyStart} <span aria-hidden="true">♡</span> {t.emptyEnd}
        </p>
        <Link href={localePath(locale, "/jobs")} className="why-tile__button">
          {t.browse}
        </Link>
      </div>
    )
  }

  const open = saved.filter((j) => !expired?.has(j.id))
  const gone = saved.filter((j) => expired?.has(j.id))

  return (
    <div className="saved">
      <div className="results-head">
        <h2>{jobCountLabel(open.length, locale)}</h2>
      </div>
      {open.length ? (
        <div className="grid grid--list">
          {open.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}

      {gone.length ? (
        <section className="saved-expired">
          <div className="saved-expired__head">
            <h3>{t.expired}</h3>
            <button type="button" className="active-filters__clear" onClick={() => gone.forEach((j) => removeSaved(j.id))}>
              {t.removeExpired}
            </button>
          </div>
          <ul>
            {gone.map((job) => (
              <li key={job.id}>
                <span>
                  <strong>{job.title}</strong>
                  {job.company ? ` · ${job.company}` : ""}
                  {job.salary_text ? ` · ${job.salary_text}` : ""}
                </span>
                <button type="button" className="active-filters__clear" onClick={() => removeSaved(job.id)}>
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
