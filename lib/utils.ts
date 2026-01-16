import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date string based on locale
 * For pt-BR: dd/mm/yyyy
 * For es: dd/mm/yyyy
 * For en: mm/dd/yyyy (default)
 */
export function formatDateByLocale(dateString: string, locale: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  // Map locale to date format
  const localeMap: Record<string, Intl.LocaleOptions> = {
    'pt-BR': { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    'es': {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    'en': {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }
  }

  const options = localeMap[locale] || localeMap['en']
  return date.toLocaleDateString(locale, options)
}
