"use client"

interface LightingIndicatorProps {
  lighting: string
  size?: "sm" | "md" | "lg"
}

export function LightingIndicator({ lighting, size = "md" }: LightingIndicatorProps) {
  // Determine lighting level and visual representation
  const getLightingTheme = (lightingText: string): { 
    bg: string; 
    text: string; 
    border: string; 
    icon: string;
    level: number;
  } => {
    const lower = lightingText.toLowerCase()
    
    if (lower.includes('bright') || lower.includes('well-lit') || lower.includes('sunlight') || lower.includes('daylight')) {
      return { 
        bg: 'bg-yellow-500/20', 
        text: 'text-yellow-600 dark:text-yellow-400', 
        border: 'border-yellow-500/50',
        icon: '☀️',
        level: 100
      }
    }
    if (lower.includes('dim') || lower.includes('shadow') || lower.includes('twilight') || lower.includes('dusk')) {
      return { 
        bg: 'bg-orange-500/20', 
        text: 'text-orange-600 dark:text-orange-400', 
        border: 'border-orange-500/50',
        icon: '🌅',
        level: 50
      }
    }
    if (lower.includes('dark') || lower.includes('pitch') || lower.includes('black') || lower.includes('no light')) {
      return { 
        bg: 'bg-slate-500/20', 
        text: 'text-slate-600 dark:text-slate-400', 
        border: 'border-slate-500/50',
        icon: '🌑',
        level: 0
      }
    }
    if (lower.includes('candle') || lower.includes('torch') || lower.includes('firelight')) {
      return { 
        bg: 'bg-red-500/20', 
        text: 'text-red-600 dark:text-red-400', 
        border: 'border-red-500/50',
        icon: '🕯️',
        level: 30
      }
    }
    if (lower.includes('magical') || lower.includes('glow') || lower.includes('enchant')) {
      return { 
        bg: 'bg-purple-500/20', 
        text: 'text-purple-600 dark:text-purple-400', 
        border: 'border-purple-500/50',
        icon: '✨',
        level: 60
      }
    }
    
    // Default moderate
    return { 
      bg: 'bg-blue-500/20', 
      text: 'text-blue-600 dark:text-blue-400', 
      border: 'border-blue-500/50',
      icon: '💡',
      level: 70
    }
  }

  const theme = getLightingTheme(lighting)
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border-2 ${theme.border} ${theme.bg} ${sizeClasses[size]} font-semibold ${theme.text}`}>
      <span>{theme.icon}</span>
      <span>{lighting}</span>
      <div className="flex items-center gap-1 ml-1">
        <div className="w-12 h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className={`h-full ${theme.bg.replace('/20', '')} rounded-full transition-all`}
            style={{ width: `${theme.level}%` }}
          />
        </div>
      </div>
    </div>
  )
}
