"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface AdvancedFormFieldProps {
  /** Associated input id for the label */
  htmlFor?: string
  /** Label text */
  label: React.ReactNode
  /** Optional help/description below the input */
  help?: React.ReactNode
  /** Validation error message; when present, help is usually not shown or error takes precedence */
  error?: string
  /** Optional class for the wrapper */
  className?: string
  /** Optional, e.g. md:col-span-2 for grid layout */
  wrapperClassName?: string
  children: React.ReactNode
}

/**
 * Reusable form field wrapper for advanced generator inputs.
 * Renders label, input slot, optional help text, and validation error.
 * Controlled via props (no react-hook-form).
 */
export function AdvancedFormField({
  htmlFor,
  label,
  help,
  error,
  className,
  wrapperClassName,
  children,
}: AdvancedFormFieldProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-primary/15 bg-background/40 p-3 shadow-sm",
        "transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
        wrapperClassName,
        className
      )}
    >
      <Label
        htmlFor={htmlFor}
        className={cn("font-body text-base font-semibold tracking-wide", error && "text-destructive")}
      >
        {label}
      </Label>
      <div className="w-full">{children}</div>
      {error && (
        <p className="text-sm font-medium text-destructive font-body" role="alert">
          {error}
        </p>
      )}
      {help && !error && (
        <p className="text-sm text-muted-foreground font-body leading-relaxed">{help}</p>
      )}
    </div>
  )
}
