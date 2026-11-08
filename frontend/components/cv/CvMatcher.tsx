"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import JobCard from "../job/JobCard"
import { matchCv } from "../../lib/api"
import { trackEvent } from "../../lib/analytics"
import { CvMatchResult } from "../../lib/types"

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

type State =
  | { kind: "idle" }
  | { kind: "loading"; fileName: string }
  | { kind: "error"; message: string }
  | { kind: "done"; result: CvMatchResult }

/** Upload box → AI matches. The CV only lives in this request; nothing is kept. */
export default function CvMatcher() {
  const [state, setState] = useState<State>({ kind: "idle" })
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setState({ kind: "error", message: "Podržani su samo PDF i Word (.docx) dokumenti." })
      return
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: "Datoteka je veća od 5 MB." })
      return
    }
    setState({ kind: "loading", fileName: file.name })
    trackEvent("cv_upload")
    try {
      const result = await matchCv(file)
      trackEvent("cv_matches", { count: result.matches.length })
      setState({ kind: "done", result })
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Nešto je pošlo po zlu." })
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
            <strong>Čitam „{state.fileName}“ i tražim poslove…</strong>
            <span>Obično traje 10 do 30 sekundi.</span>
          </>
        ) : (
          <>
            <strong>{state.kind === "done" ? "Učitaj drugi CV" : "Odaberi svoj CV"}</strong>
            <span>ili ga povuci ovdje · PDF ili Word, do 5 MB</span>
          </>
        )}
      </label>

      <p className="cv__privacy">
        CV ne spremamo. Pročita ga AI model (Claude, tvrtke Anthropic) samo da bi izabrao oglase, i odmah ga
        zaboravljamo. <Link href="/privatnost">Više o privatnosti</Link>
      </p>

      <div aria-live="polite">
        {state.kind === "error" ? <p className="cv__error">{state.message}</p> : null}

        {state.kind === "done" ? (
          <section className="cv-results">
            {state.result.profile_summary ? <p className="cv-results__summary">{state.result.profile_summary}</p> : null}
            {state.result.matches.length ? (
              <>
                <div className="results-head">
                  <h2>Oglasi koji ti odgovaraju</h2>
                </div>
                <ol className="cv-results__list">
                  {state.result.matches.map(({ job, reason }) => (
                    <li key={job.id} className="cv-match">
                      <p className="cv-match__reason">{reason}</p>
                      <JobCard job={job} />
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="saved-empty">
                <p>Trenutno nema oglasa koji dobro odgovaraju tvom CV-u. Novi stižu svakih nekoliko sati.</p>
                <Link href="/jobs" className="why-tile__button">
                  Pregledaj sve oglase →
                </Link>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
