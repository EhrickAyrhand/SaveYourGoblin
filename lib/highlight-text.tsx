import React from "react"

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Splits text by the given term (case-insensitive) and wraps matches in <mark>.
 * Returns a ReactNode (string or array of string | ReactElement).
 */
export function highlightText(text: string, term: string): React.ReactNode {
  if (!term || !text) return text
  const esc = escapeRegex(term)
  const parts = text.split(new RegExp(`(${esc})`, "gi"))
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase()
      ? React.createElement(
          "mark",
          {
            key: i,
            className: "bg-primary/30 text-primary rounded px-0.5 font-medium",
          },
          p
        )
      : p
  )
}
