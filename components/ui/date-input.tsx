"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "./input"

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  locale: string
  placeholder?: string
  className?: string
}

/**
 * Custom date input that displays dates in locale-specific format
 * For pt-BR/es: dd/mm/yyyy
 * For en: mm/dd/yyyy
 * Internally uses YYYY-MM-DD for HTML5 date input compatibility
 */
export function DateInput({ value, onChange, locale, placeholder, className }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLInputElement>(null)

  // Convert YYYY-MM-DD to locale format for display
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return ""
    const [year, month, day] = isoDate.split("-")
    if (!year || !month || !day) return isoDate

    if (locale === "pt-BR" || locale === "es") {
      return `${day}/${month}/${year}`
    }
    return `${month}/${day}/${year}`
  }

  // Convert locale format to YYYY-MM-DD
  const parseDateFromDisplay = (displayDate: string): string => {
    if (!displayDate) return ""

    // Remove any non-numeric characters except /
    const cleaned = displayDate.replace(/[^\d\/]/g, "")
    const parts = cleaned.split("/").filter(Boolean)

    if (parts.length !== 3) return ""

    let day: string, month: string, year: string

    if (locale === "pt-BR" || locale === "es") {
      // Format: dd/mm/yyyy
      ;[day, month, year] = parts
    } else {
      // Format: mm/dd/yyyy
      ;[month, day, year] = parts
    }

    // Pad single digits
    day = day.padStart(2, "0")
    month = month.padStart(2, "0")

    // Ensure year is 4 digits
    if (year.length === 2) {
      const currentYear = new Date().getFullYear()
      const century = Math.floor(currentYear / 100) * 100
      year = (century + parseInt(year)).toString()
    }

    // Validate date parts
    const dayNum = parseInt(day)
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      return ""
    }

    return `${year}-${month}-${day}`
  }

  // Update display value when value prop changes
  useEffect(() => {
    if (value) {
      const formatted = formatDateForDisplay(value)
      setDisplayValue(formatted)
    } else {
      setDisplayValue("")
    }
  }, [value, locale])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value
    setDisplayValue(newDisplayValue)

    // Parse to ISO format
    const isoDate = parseDateFromDisplay(newDisplayValue)

    // Update only if valid
    if (isoDate) {
      onChange(isoDate)
    } else if (newDisplayValue === "") {
      onChange("")
    }
  }

  const handleTextClick = () => {
    // When clicking on text input, trigger the hidden date picker
    if (datePickerRef.current) {
      datePickerRef.current.showPicker?.()
    }
  }

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value
    const formatted = formatDateForDisplay(isoDate)
    setDisplayValue(formatted)
    onChange(isoDate)
  }

  const placeholderText = locale === "pt-BR" || locale === "es" 
    ? "dd/mm/aaaa" 
    : "mm/dd/yyyy"

  return (
    <div className="relative">
      {/* Visible text input with formatted date */}
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        onClick={handleTextClick}
        placeholder={placeholder || placeholderText}
        className={className}
        inputMode="numeric"
      />
      {/* Hidden HTML5 date input for native date picker */}
      <input
        ref={datePickerRef}
        type="date"
        value={value || ""}
        onChange={handleDatePickerChange}
        className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}
