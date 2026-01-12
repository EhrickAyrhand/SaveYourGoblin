import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale

  // Ensure that the incoming `locale` is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  // Use static imports to avoid dynamic import issues with Next.js bundler
  let messages
  switch (locale) {
    case 'pt-BR':
      messages = (await import('../messages/pt-BR.json')).default
      break
    case 'es':
      messages = (await import('../messages/es.json')).default
      break
    case 'en':
    default:
      messages = (await import('../messages/en.json')).default
      break
  }

  return {
    locale,
    messages
  }
})
