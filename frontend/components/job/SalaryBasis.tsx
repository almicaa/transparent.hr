import { Job } from "../../lib/types"
import { Locale } from "../../lib/i18n"
import { basisLabel } from "../../lib/labels"

const COPY = {
  hr: { unknown: "neto/bruto?", unknownTitle: "Poslodavac u oglasu nije naveo je li iznos neto ili bruto" },
  en: { unknown: "net/gross?", unknownTitle: "The employer didn't say in the ad whether this is net or gross pay" },
}

/** "neto" / "bruto" next to the amount; when the ad doesn't say, an explicit
 *  "neto/bruto?" so the reader knows it's unstated, not missing on our side. */
export default function SalaryBasis({ job, locale }: { job: Pick<Job, "salary_basis">; locale: Locale }) {
  if (job.salary_basis) return <span className="job__basis">{basisLabel(job.salary_basis, locale)}</span>
  return (
    <span className="job__basis job__basis--unknown" title={COPY[locale].unknownTitle}>
      {COPY[locale].unknown}
    </span>
  )
}
