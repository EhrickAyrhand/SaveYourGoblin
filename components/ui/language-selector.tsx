"use client"

import { useState } from "react"
import { Globe, ChevronDown } from "lucide-react"
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { localeNames } from '@/i18n/config'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LanguageSelector() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full border-2 border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary/10 transition-all shadow-lg"
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">{localeNames[locale as keyof typeof localeNames]}</span>
          <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", isOpen && "rotate-180")} />
        </Button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border-2 border-primary/30 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden z-50">
              {Object.entries(localeNames).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => handleLocaleChange(code)}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-primary/10",
                    locale === code && "bg-primary/20 text-primary font-semibold"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
