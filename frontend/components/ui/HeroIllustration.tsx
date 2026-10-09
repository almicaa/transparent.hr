/**
 * Decorative backdrop for the home hero: the logo's overlapping rounded
 * squares in the brand teal plus warm accents.
 */
export default function HeroIllustration() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="hero-art__shapes hero-art__shapes--left" viewBox="0 0 220 220" fill="none">
        <rect x="18" y="40" width="120" height="120" rx="28" fill="#1D9E9E" fillOpacity="0.16" />
        <rect x="70" y="86" width="110" height="110" rx="26" fill="#F6C85F" fillOpacity="0.35" />
        <rect x="70" y="86" width="110" height="110" rx="26" stroke="#085050" strokeOpacity="0.25" strokeWidth="2.5" />
      </svg>
      <svg className="hero-art__shapes hero-art__shapes--right" viewBox="0 0 220 220" fill="none">
        <rect x="80" y="20" width="110" height="110" rx="26" fill="#F28C6B" fillOpacity="0.22" />
        <rect x="30" y="70" width="120" height="120" rx="28" fill="#1D9E9E" fillOpacity="0.14" />
        <rect x="30" y="70" width="120" height="120" rx="28" stroke="#1D9E9E" strokeOpacity="0.35" strokeWidth="2.5" />
      </svg>

      <span className="hero-art__dot hero-art__dot--a" />
      <span className="hero-art__dot hero-art__dot--b" />
      <span className="hero-art__dot hero-art__dot--c" />
    </div>
  )
}
