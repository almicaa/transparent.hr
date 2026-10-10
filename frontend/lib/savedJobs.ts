"use client"

import { useSyncExternalStore } from "react"
import { Job } from "./types"

// Saved jobs live in the visitor's own browser (no account), as snapshots so
// the list still shows a job's title and pay after the ad itself expires.
// Newest first. Every read/write is guarded: storage can be full, blocked or
// missing (private mode), and the page must work without it.
const STORAGE_KEY = "saved_jobs"
const CHANGE_EVENT = "saved-jobs-change"
const MAX_SAVED = 200
const EMPTY: Job[] = []

let cache: Job[] | null = null

function read(): Job[] {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    cache = Array.isArray(parsed) ? parsed : []
  } catch {
    cache = []
  }
  return cache
}

function write(jobs: Job[]) {
  cache = jobs
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    // Another tab changed the list.
    if (e.key === STORAGE_KEY) {
      cache = null
      onChange()
    }
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onStorage)
  }
}

/** The saved jobs, live across components and tabs; empty on the server. */
export function useSavedJobs(): Job[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function isSaved(jobs: Job[], id: number): boolean {
  return jobs.some((j) => j.id === id)
}

/** Saves the job if it isn't saved, removes it if it is. Returns the new state. */
export function toggleSaved(job: Job): boolean {
  const jobs = read()
  if (isSaved(jobs, job.id)) {
    write(jobs.filter((j) => j.id !== job.id))
    return false
  }
  write([job, ...jobs].slice(0, MAX_SAVED))
  return true
}

export function removeSaved(id: number) {
  write(read().filter((j) => j.id !== id))
}

/** Refreshes stored snapshots with current data (pay or deadline may have changed). */
export function updateSaved(fresh: Job[]) {
  const byId = new Map(fresh.map((j) => [j.id, j]))
  const jobs = read()
  if (!jobs.some((j) => byId.has(j.id))) return
  write(jobs.map((j) => byId.get(j.id) ?? j))
}
