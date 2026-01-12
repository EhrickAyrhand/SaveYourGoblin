"use client"

interface StatBarProps {
  label: string
  value: number
  modifier: number
  color?: string
}

export function StatBar({ label, value, modifier, color = "primary" }: StatBarProps) {
  // Calculate percentage for visual bar (assuming max is 20, min is 1)
  const percentage = ((value - 1) / 19) * 100
  
  const colorClasses = {
    primary: "bg-primary",
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  }
  
  const bgColorClasses = {
    primary: "bg-primary/10",
    red: "bg-red-500/10",
    orange: "bg-orange-500/10",
    yellow: "bg-yellow-500/10",
    green: "bg-green-500/10",
    blue: "bg-blue-500/10",
    purple: "bg-purple-500/10",
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-body font-semibold text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-display font-bold">{value}</span>
          <span className="text-sm font-body font-semibold text-primary">
            {modifier >= 0 ? `+${modifier}` : `${modifier}`}
          </span>
        </div>
      </div>
      <div className={`h-3 rounded-full ${bgColorClasses[color as keyof typeof bgColorClasses] || bgColorClasses.primary} overflow-hidden`}>
        <div 
          className={`h-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
