export type DateInput = string | Date | null | undefined

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateInput(value: DateInput): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  const dateOnlyMatch = DATE_ONLY_REGEX.exec(trimmed)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2]) - 1
    const day = Number(dateOnlyMatch[3])
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateWithLocale(
  value: DateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInput(value)
  if (!date) return typeof value === "string" ? value : ""
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatDateMedium(value: DateInput, locale: string): string {
  return formatDateWithLocale(value, locale, { dateStyle: "medium" })
}

export function formatDateTimeMedium(value: DateInput, locale: string): string {
  return formatDateWithLocale(value, locale, { dateStyle: "medium", timeStyle: "short" })
}

export function formatDateTimeCompact(value: DateInput, locale: string): string {
  const date = parseDateInput(value)
  if (!date) return typeof value === "string" ? value : ""

  const now = new Date()
  const includeYear = date.getFullYear() !== now.getFullYear()
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
  }
  if (includeYear) {
    dateOptions.year = "2-digit"
  }

  const datePart = new Intl.DateTimeFormat(locale, dateOptions).format(date)
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)

  return `${datePart} ${timePart}`
}

export function formatDateNumericShort(value: DateInput, locale: string): string {
  return formatDateWithLocale(value, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

export function formatDateDayMonthYearShort(value: DateInput): string {
  const date = parseDateInput(value)
  if (!date) return typeof value === "string" ? value : ""
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}
