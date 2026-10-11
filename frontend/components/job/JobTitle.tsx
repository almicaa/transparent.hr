import { Fragment } from "react"
import { displayTitle } from "../../lib/format"

/** A job title that may wrap after a slash ("Prodavač/<wbr>prodavačica") rather
 * than mid-word — HZZ titles pair the masculine and feminine form that way. */
export default function JobTitle({ title }: { title: string }) {
  const parts = displayTitle(title).split("/")
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <>
              /<wbr />
            </>
          ) : null}
          {part}
        </Fragment>
      ))}
    </>
  )
}
