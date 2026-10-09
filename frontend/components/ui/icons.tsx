import type { ReactNode } from "react"

function IconWrap({ children }: { children: ReactNode }) {
  return <span className="feature-icon">{children}</span>
}

export function EuroIcon() {
  return (
    <IconWrap>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#085050" strokeWidth="1.6" />
        <path
          d="M15 8.5c-.9-.8-2-1.3-3.2-1.3-2.6 0-4.7 2.2-4.7 4.8s2.1 4.8 4.7 4.8c1.2 0 2.3-.5 3.2-1.3"
          stroke="#085050"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M6.5 10.2h6" stroke="#085050" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6.5 13.2h6" stroke="#085050" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </IconWrap>
  )
}

export function LayersIcon() {
  return (
    <IconWrap>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="13" height="13" rx="4" stroke="#085050" strokeWidth="1.6" />
        <rect x="8" y="8" width="13" height="13" rx="4" fill="#F08A24" fillOpacity="0.6" />
      </svg>
    </IconWrap>
  )
}

export function CheckIcon() {
  return (
    <IconWrap>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#085050" strokeWidth="1.6" />
        <path d="M7.5 12.5l2.6 2.6 6-6.2" stroke="#085050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  )
}

export function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="arrow-icon" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 0 0-9 0c0 3.8 4.5 8 4.5 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="8" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
