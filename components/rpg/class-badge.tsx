"use client"

interface ClassBadgeProps {
  className: string
  level: number
  size?: "sm" | "md" | "lg"
}

const classColors: Record<string, { bg: string; text: string; border: string }> = {
  Barbarian: { bg: "bg-red-500/20", text: "text-red-600 dark:text-red-400", border: "border-red-500/50" },
  Bard: { bg: "bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/50" },
  Cleric: { bg: "bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/50" },
  Druid: { bg: "bg-green-500/20", text: "text-green-600 dark:text-green-400", border: "border-green-500/50" },
  Fighter: { bg: "bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/50" },
  Monk: { bg: "bg-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/50" },
  Paladin: { bg: "bg-pink-500/20", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/50" },
  Ranger: { bg: "bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/50" },
  Rogue: { bg: "bg-slate-500/20", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/50" },
  Sorcerer: { bg: "bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/50" },
  Warlock: { bg: "bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/50" },
  Wizard: { bg: "bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/50" },
}

export function ClassBadge({ className, level, size = "md" }: ClassBadgeProps) {
  const colors = classColors[className] || { bg: "bg-primary/20", text: "text-primary", border: "border-primary/50" }
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border-2 ${colors.border} ${colors.bg} ${sizeClasses[size]} font-semibold ${colors.text}`}>
      <span className="font-display">{className}</span>
      <span className="text-muted-foreground">•</span>
      <span>Level {level}</span>
    </div>
  )
}
