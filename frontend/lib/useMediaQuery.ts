import { useEffect, useState } from "react"

/** Whether a CSS media query matches; false until mounted (server render). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [query])
  return matches
}

/** The CSS breakpoint where the /jobs filter drawer becomes a sidebar. */
export const SIDEBAR_QUERY = "(min-width: 1024px)"
