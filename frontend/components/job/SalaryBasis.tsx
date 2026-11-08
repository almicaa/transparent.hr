import { Job } from "../../lib/types"

/** "neto" / "bruto" next to the amount; when the ad doesn't say, an explicit
 *  "neto/bruto?" so the reader knows it's unstated, not missing on our side. */
export default function SalaryBasis({ job }: { job: Pick<Job, "salary_basis"> }) {
  if (job.salary_basis) return <span className="job__basis">{job.salary_basis}</span>
  return (
    <span className="job__basis job__basis--unknown" title="Poslodavac u oglasu nije naveo je li iznos neto ili bruto">
      neto/bruto?
    </span>
  )
}
