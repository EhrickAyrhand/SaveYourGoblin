"use client"

interface PathTypeBadgeProps {
  pathType: 'combat' | 'social' | 'stealth' | 'mixed'
  size?: "sm" | "md" | "lg"
}

export function PathTypeBadge({ pathType, size = "md" }: PathTypeBadgeProps) {
  const pathConfig = {
    combat: { 
      label: 'Combat', 
      icon: '⚔️',
      bg: 'bg-red-500/20', 
      text: 'text-red-600 dark:text-red-400', 
      border: 'border-red-500/50'
    },
    social: { 
      label: 'Social', 
      icon: '💬',
      bg: 'bg-blue-500/20', 
      text: 'text-blue-600 dark:text-blue-400', 
      border: 'border-blue-500/50'
    },
    stealth: { 
      label: 'Stealth', 
      icon: '🥷',
      bg: 'bg-purple-500/20', 
      text: 'text-purple-600 dark:text-purple-400', 
      border: 'border-purple-500/50'
    },
    mixed: { 
      label: 'Mixed', 
      icon: '🔄',
      bg: 'bg-orange-500/20', 
      text: 'text-orange-600 dark:text-orange-400', 
      border: 'border-orange-500/50'
    },
  }

  const config = pathConfig[pathType]
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border-2 ${config.border} ${config.bg} ${sizeClasses[size]} font-semibold ${config.text}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  )
}
