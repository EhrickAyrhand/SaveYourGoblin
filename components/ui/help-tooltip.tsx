import * as React from "react"

import { cn } from "@/lib/utils"

export interface HelpTooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
}

export function HelpTooltip({ text, className, ...props }: HelpTooltipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/50 text-[10px] font-semibold text-muted-foreground/80",
        "cursor-help select-none",
        className
      )}
      title={text}
      aria-label={text}
      {...props}
    >
      ?
    </span>
  )
}
