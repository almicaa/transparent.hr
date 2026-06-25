/**
 * Two overlapping rounded squares: one pure outline, one translucent fill.
 * The overlap is the point — looking "through" one shape into the other,
 * a visual metaphor for transparency.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="3" width="20" height="20" rx="6" stroke="#085050" strokeWidth="2.4" />
      <rect x="9" y="9" width="20" height="20" rx="6" fill="#1D9E9E" fillOpacity="0.65" />
    </svg>
  )
}

export default function Logo({ withWordmark = true, size = 28 }: { withWordmark?: boolean; size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {withWordmark ? <span className="logo__wordmark">transparent.hr</span> : null}
    </span>
  )
}
