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
    <div className={cn("space-y-2", wrapperClassName, className)}>
      <Label
        htmlFor={htmlFor}
        className={cn("font-body text-sm font-semibold", error && "text-destructive")}
      >
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs font-medium text-destructive font-body" role="alert">
          {error}
        </p>
      )}
      {help && !error && (
        <p className="text-xs text-muted-foreground font-body">{help}</p>
      )}
    </div>
  )
}
