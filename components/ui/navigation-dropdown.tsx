"use client"

import { useState } from "react"
import { ChevronDown, Menu } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavigationDropdownProps {
  onSignOut?: () => void
}

export function NavigationDropdown({ onSignOut }: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/generator", label: "Generator", icon: "⚡" },
    { href: "/library", label: "Library", icon: "📚" },
    { href: "/profile", label: "Profile", icon: "👤" },
    { href: "/", label: "Home", icon: "🏠" },
  ]

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="font-body"
      >
        <Menu className="mr-2 h-4 w-4" />
        Menu
        <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop to close on click outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown Menu */}
          <div className="absolute top-full right-0 mt-2 w-48 z-50">
            <div className="parchment ornate-border rounded-lg shadow-lg p-2 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-body hover:bg-primary/10 transition-colors"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
                {onSignOut && (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      onSignOut()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-body hover:bg-destructive/10 transition-colors text-left"
                  >
                    <span className="text-lg">🚪</span>
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
