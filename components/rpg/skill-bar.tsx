"use client"

interface SkillBarProps {
  name: string
  ability: string
  modifier: number
  isProficient: boolean
  isExpertise: boolean
}

export function SkillBar({ name, ability, modifier, isProficient, isExpertise }: SkillBarProps) {
  // Calculate visual bar percentage (assuming range from -5 to +10)
  const minMod = -5
  const maxMod = 10
  const percentage = ((modifier - minMod) / (maxMod - minMod)) * 100
  
  let barColor = "bg-muted"
  let bgColor = "bg-muted/20"
  let statusBadge = null
  
  if (isExpertise) {
    barColor = "bg-blue-500"
    bgColor = "bg-blue-500/20"
    statusBadge = (
      <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-semibold">
        EXPERTISE
      </span>
    )
  } else if (isProficient) {
    barColor = "bg-green-500"
    bgColor = "bg-green-500/20"
    statusBadge = (
      <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-semibold">
        PROFICIENT
      </span>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {(isProficient || isExpertise) && (
            <span className="text-primary font-bold text-sm flex-shrink-0">✓</span>
          )}
          <span className={`text-sm ${isProficient || isExpertise ? "font-semibold" : ""} truncate`}>
            {name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">({ability})</span>
          {statusBadge}
        </div>
        <span className={`text-sm font-semibold flex-shrink-0 ${
          isProficient || isExpertise ? "text-primary" : "text-muted-foreground"
        }`}>
          {modifier >= 0 ? `+${modifier}` : `${modifier}`}
        </span>
      </div>
      <div className={`h-2 rounded-full ${bgColor} overflow-hidden`}>
        <div 
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${Math.max(5, percentage)}%` }}
        />
      </div>
    </div>
  )
}
