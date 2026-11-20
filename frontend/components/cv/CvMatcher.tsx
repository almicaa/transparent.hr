"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import JobCard from "../job/JobCard"
import { matchCv } from "../../lib/api"
import { trackEvent } from "../../lib/analytics"
import { CvMatchResult } from "../../lib/types"
import { localePath } from "../../lib/i18n"
import { useLocale } from "../i18n/LocaleProvider"

const COPY = {
  hr: {
    wrongType: "Podržani su samo PDF i Word (.docx) dokumenti.",
    tooBig: "Datoteka je veća od 5 MB.",
    failed: "Nešto je pošlo po zlu.",
    reading: (name: string) => `Čitam „${name}“ i tražim poslove…`,
    duration: "Obično traje 10 do 30 sekundi.",
    another: "Učitaj drugi CV",
    choose: "Odaberi svoj CV",
    hint: "ili ga povuci ovdje · PDF ili Word, do 5 MB",
    privacy:
      "CV ne spremamo. Pročita ga AI model (Claude, tvrtke Anthropic) samo da bi izabrao oglase, i odmah ga zaboravljamo.",
    privacyLink: "Više o privatnosti",
    matches: "Oglasi koji ti odgovaraju",
    missing: "Nedostaje ti",
    none: "Trenutno nema oglasa koji dobro odgovaraju tvom CV-u. Novi stižu svakih nekoliko sati.",
    browse: "Pregledaj sve oglase →",
  },
  en: {
    wrongType: "Only PDF and Word (.docx) documents are supported.",
    tooBig: "The file is larger than 5 MB.",
    failed: "Something went wrong.",
    reading: (name: string) => `Reading “${name}” and looking for jobs…`,
    duration: "This usually takes 10 to 30 seconds.",
    another: "Upload another CV",
    choose: "Choose your CV",
    hint: "or drop it here · PDF or Word, up to 5 MB",
    privacy:
      "We don't keep your CV. An AI model (Claude, by Anthropic) reads it only to pick job ads, and we forget it straight away.",
    privacyLink: "More about privacy",
    matches: "Jobs that fit you",
    missing: "You're missing",
    none: "There are no jobs that fit your CV well right now. New ones arrive every few hours.",
    browse: "Browse all jobs →",
  },
}

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

type State =
  | { kind: "idle" }
  | { kind: "loading"; fileName: string }
  | { kind: "error"; message: string }
  | { kind: "done"; result: CvMatchResult }

/** Upload box → AI matches. The CV only lives in this request; nothing is kept. */
export default function CvMatcher() {
  const locale = useLocale()
  const t = COPY[locale]
  const [state, setState] = useState<State>({ kind: "idle" })
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setState({ kind: "error", message: t.wrongType })
      return
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: t.tooBig })
      return
    }
    setState({ kind: "loading", fileName: file.name })
    trackEvent("cv_upload", { language: locale })
    try {
      const result = await matchCv(file, locale)
      trackEvent("cv_matches", { count: result.matches.length })
      setState({ kind: "done", result })
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : t.failed })
    } finally {
      if (input.current) input.current.value = ""
    }
  }

  const loading = state.kind === "loading"

  return (
    <div className="cv">
      <label
        className={`cv-drop ${dragging ? "is-dragging" : ""} ${loading ? "is-loading" : ""}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!loading) upload(e.dataTransfer.files[0])
        }}
      >
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          disabled={loading}
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {loading ? (
          <>
            <span className="cv-drop__spinner" aria-hidden="true" />
            <strong>{t.reading(state.fileName)}</strong>
            <span>{t.duration}</span>
          </>
        ) : (
          <>
            <strong>{state.kind === "done" ? t.another : t.choose}</strong>
            <span>{t.hint}</span>
          </>
        )}
      </label>

      <p className="cv__privacy">
        {t.privacy} <Link href={localePath(locale, "/privatnost")}>{t.privacyLink}</Link>
      </p>

      <div aria-live="polite">
        {state.kind === "error" ? <p className="cv__error">{state.message}</p> : null}

        {state.kind === "done" ? (
          <section className="cv-results">
            {state.result.profile_summary ? <p className="cv-results__summary">{state.result.profile_summary}</p> : null}
            {state.result.matches.length ? (
              <>
                <div className="results-head">
                  <h2>{t.matches}</h2>
                </div>
                <ol className="cv-results__list">
                  {state.result.matches.map(({ job, reason, missing }) => (
                    <li key={job.id} className="cv-match">
                      <div className="cv-match__note">
                        <p className="cv-match__reason">{reason}</p>
                        {missing ? <p className="cv-match__missing">
                            {t.missing}: {missing}
                          </p> : null}
                      </div>
                      <JobCard job={job} />
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="saved-empty">
                <p>{t.none}</p>
                <Link href={localePath(locale, "/jobs")} className="why-tile__button">
                  {t.browse}
                </Link>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
