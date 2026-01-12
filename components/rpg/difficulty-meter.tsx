"use client"

interface DifficultyMeterProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly'
  size?: "sm" | "md" | "lg"
}

export function DifficultyMeter({ difficulty, size = "md" }: DifficultyMeterProps) {
  const difficultyConfig = {
    easy: { 
      label: 'Easy', 
      color: 'bg-green-500', 
      bgColor: 'bg-green-500/20', 
      borderColor: 'border-green-500/50',
      textColor: 'text-green-600 dark:text-green-400',
      icon: '🟢',
      level: 25
    },
    medium: { 
      label: 'Medium', 
      color: 'bg-yellow-500', 
      bgColor: 'bg-yellow-500/20', 
      borderColor: 'border-yellow-500/50',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      icon: '🟡',
      level: 50
    },
    hard: { 
      label: 'Hard', 
      color: 'bg-orange-500', 
      bgColor: 'bg-orange-500/20', 
      borderColor: 'border-orange-500/50',
      textColor: 'text-orange-600 dark:text-orange-400',
      icon: '🟠',
      level: 75
    },
    deadly: { 
      label: 'Deadly', 
      color: 'bg-red-500', 
      bgColor: 'bg-red-500/20', 
      borderColor: 'border-red-500/50',
      textColor: 'text-red-600 dark:text-red-400',
      icon: '🔴',
      level: 100
    },
  }

  const config = difficultyConfig[difficulty]
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <div className={`inline-flex items-center gap-3 rounded-lg border-2 ${config.borderColor} ${config.bgColor} ${sizeClasses[size]} font-semibold ${config.textColor}`}>
      <span className="text-lg">{config.icon}</span>
      <span>{config.label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className={`h-full ${config.color} rounded-full transition-all`}
            style={{ width: `${config.level}%` }}
          />
        </div>
      </div>
    </div>
  )
}
