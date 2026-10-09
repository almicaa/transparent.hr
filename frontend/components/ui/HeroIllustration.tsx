/**
 * Decorative backdrop for the home hero: a soft orange wave sweeping up from
 * the bottom-left over the teal base, plus the logo's overlapping squares.
 */
export default function HeroIllustration() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="hero-art__wave" viewBox="0 0 1200 600" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="hero-wave" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F08A24" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#F9C89A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FDE8D4" stopOpacity="0.2" />
          </linearGradient>
          <filter id="hero-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <path
          d="M-60 640 C 300 600 600 480 820 340 C 980 240 1100 170 1260 110 L 1260 660 Z"
          fill="url(#hero-wave)"
          filter="url(#hero-blur)"
        />
        <path
          d="M-60 640 C 300 600 600 480 820 340 C 980 240 1100 170 1260 110"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="4"
          filter="url(#hero-blur)"
        />
      </svg>
      <svg className="hero-art__shapes" viewBox="0 0 220 220" fill="none">
        <rect x="18" y="40" width="120" height="120" rx="28" fill="#1D9E9E" fillOpacity="0.14" />
        <rect x="70" y="86" width="110" height="110" rx="26" stroke="#085050" strokeOpacity="0.22" strokeWidth="2.5" />
      </svg>
    </div>
  )
}
