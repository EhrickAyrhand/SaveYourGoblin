---
name: i18n Implementation Plan
overview: Implement internationalization (i18n) for Portuguese (Brazil), English, and Spanish using next-intl. This involves restructuring the app directory, creating translation files, adding middleware for locale routing, and updating all components to use translations.
todos: []
---

# i18n Implementation Plan

## Overview

Implement internationalization support for three languages:

- English (en) - default
- Portuguese Brazil (pt-BR)
- Spanish (es)

Using `next-intl` library for Next.js 16 App Router.

## Architecture

The implementation will follow Next.js App Router conventions with locale-based routing:

```
app/
  [locale]/              # Locale-specific pages
    page.tsx
    generator/
    library/
    profile/
    (auth)/
  api/                   # API routes (no locale prefix)
  layout.tsx             # Root layout (locale validation)
  globals.css
```

## Implementation Steps

### 1. Install Dependencies

Add `next-intl` package:

```bash
npm install next-intl
```

### 2. Create i18n Configuration

**File: `i18n/config.ts`** (new)

- Define supported locales: `['en', 'pt-BR', 'es']`
- Set default locale: `'en'`
- Export locale type and display names

**File: `i18n/request.ts`** (new)

- Use `getRequestConfig` from next-intl/server
- Load messages based on locale
- Fallback to default locale if invalid

### 3. Configure Next.js

**File: `next.config.ts`** (modify)

- Add `createNextIntlPlugin` wrapper
- Configure to use `./i18n/request.ts`

**File: `middleware.ts`** (new - root level)

- Use `createMiddleware` from next-intl/middleware
- Configure locale detection and routing
- Matcher: `['/', '/(pt-BR|es|en)/:path*']`
- Set `localePrefix: 'as-needed'` (no prefix for default 'en')

### 4. Restructure App Directory

**File: `app/layout.tsx`** (modify → minimal root layout)

- Generate static params for locales
- Validate locale and call `notFound()` if invalid
- Minimal wrapper for locale validation

**File: `app/[locale]/layout.tsx`** (new)

- Move current layout.tsx content here
- Wrap with `NextIntlClientProvider`
- Use `getMessages()` to load translations
- Set `lang` attribute dynamically: `lang={locale}`

**Move all pages** from `app/` to `app/[locale]/`:

- `app/page.tsx` → `app/[locale]/page.tsx`
- `app/generator/page.tsx` → `app/[locale]/generator/page.tsx`
- `app/library/page.tsx` → `app/[locale]/library/page.tsx`
- `app/profile/page.tsx` → `app/[locale]/profile/page.tsx`
- `app/(auth)/*` → `app/[locale]/(auth)/*`

**Keep API routes** in `app/api/` (outside [locale])

### 5. Create Translation Files

**File: `messages/en.json`** (new)

Organize translations by feature:

- `common`: buttons, labels, navigation
- `home`: home page content
- `generator`: generator page
- `library`: library page
- `profile`: profile page
- `auth`: authentication pages
- `rpg`: D&D-specific terms (keep in English)
- `errors`: error messages
- `success`: success messages

**File: `messages/pt-BR.json`** (new)

- Portuguese (Brazil) translations for all keys

**File: `messages/es.json`** (new)

- Spanish translations for all keys

**Important**: Keep D&D 5e terms in English across all languages:

- Ability scores: STR, DEX, CON, INT, WIS, CHA
- Skills: Acrobatics, Athletics, etc.
- Classes: Bard, Wizard, Fighter, etc.
- Other technical terms

### 6. Create Language Selector Component

**File: `components/ui/language-selector.tsx`** (new)

- Globe icon button (similar to theme selector)
- Dropdown with language options
- Use `useLocale()` and `usePathname()` from next-intl
- Update URL with locale prefix on selection
- Position: fixed bottom-left (complement to theme selector top-right)

### 7. Update Components to Use Translations

**Pages to update** (add `useTranslations` hook):

- `app/[locale]/page.tsx` - Home page
- `app/[locale]/generator/page.tsx` - Generator
- `app/[locale]/library/page.tsx` - Library
- `app/[locale]/profile/page.tsx` - Profile
- `app/[locale]/(auth)/login/page.tsx` - Login
- `app/[locale]/(auth)/register/page.tsx` - Register

**Components to update**:

- `components/ui/navigation-dropdown.tsx` - Menu items
- `components/ui/animated-banner.tsx` - Success/error messages
- `components/rpg/character-card.tsx` - Labels (keep D&D terms)
- Form components - Labels and placeholders

**Update navigation links**:

- All `Link href` should use locale-aware paths
- Use `usePathname()` and `useLocale()` from next-intl
- Create helper: `useLocalizedPathname()` if needed

### 8. Update Root Layout

**File: `app/[locale]/layout.tsx`** (modify)

- Add `NextIntlClientProvider` wrapper
- Include `LanguageSelector` component
- Dynamic `lang` attribute based on locale

### 9. Handle API Routes and External Redirects

**API routes** (`app/api/*`):

- No changes needed - they remain outside [locale]
- Responses can use locale from request headers if needed

**External redirects** (auth, sign out):

- Update to preserve locale in redirect URLs
- Example: `window.location.href = "/${locale}/login"`

### 10. Testing Checklist

- [ ] Default locale (en) works without prefix
- [ ] pt-BR locale accessible at `/pt-BR/*`
- [ ] es locale accessible at `/es/*`
- [ ] Language selector switches correctly
- [ ] All pages render with correct translations
- [ ] Navigation links preserve locale
- [ ] API routes still work
- [ ] Auth flows work with locale
- [ ] Generated content display is correct
- [ ] D&D terms remain in English
- [ ] Browser language detection works

## File Changes Summary

**New files:**

- `i18n/config.ts`
- `i18n/request.ts`
- `middleware.ts` (root)
- `messages/en.json`
- `messages/pt-BR.json`
- `messages/es.json`
- `components/ui/language-selector.tsx`
- `app/[locale]/layout.tsx` (moved from app/layout.tsx)

**Modified files:**

- `package.json` (add next-intl dependency)
- `next.config.ts` (add plugin)
- `app/layout.tsx` (minimal root layout)
- All pages (add translations, move to [locale])
- All components using text (add useTranslations)
- Navigation components (update links)

**Unchanged files:**

- `app/api/*` (API routes stay in root)

## Considerations

1. **AI-generated content**: Keep in original language (not translated)
2. **D&D 5e terms**: Always in English (STR, DEX, etc.)
3. **URL structure**: Default (en) has no prefix, others use `/pt-BR/`, `/es/`
4. **Locale detection**: Middleware detects browser language on first visit
5. **SEO**: Each locale has separate URLs for better SEO
6. **Type safety**: TypeScript will validate translation keys exist

## Translation Key Structure Example

```json
{
  "common": {
    "home": "Home",
    "generator": "Generator",
    "library": "Library",
    "profile": "Profile",
    "save": "Save",
    "cancel": "Cancel"
  },
  "generator": {
    "title": "RPG Content Generator",
    "contentType": {
      "character": "Character/NPC",
      "environment": "Environment",
      "mission": "Mission/Quest"
    }
  },
  "rpg": {
    "attributes": {
      "strength": "STR",
      "dexterity": "DEX",
      "constitution": "CON",
      "intelligence": "INT",
      "wisdom": "WIS",
      "charisma": "CHA"
    }
  }
}
```