"use client"

interface MoodBadgeProps {
  mood: string
  size?: "sm" | "md" | "lg"
}

export function MoodBadge({ mood, size = "md" }: MoodBadgeProps) {
  // Determine mood type and color scheme
  const getMoodTheme = (moodText: string): { bg: string; text: string; border: string; icon: string } => {
    const lower = moodText.toLowerCase()
    
    if (lower.includes('tense') || lower.includes('dangerous') || lower.includes('hostile') || lower.includes('fear')) {
      return { 
        bg: 'bg-red-500/20', 
        text: 'text-red-600 dark:text-red-400', 
        border: 'border-red-500/50',
        icon: '⚡'
      }
    }
    if (lower.includes('peaceful') || lower.includes('calm') || lower.includes('serene') || lower.includes('tranquil')) {
      return { 
        bg: 'bg-green-500/20', 
        text: 'text-green-600 dark:text-green-400', 
        border: 'border-green-500/50',
        icon: '🌿'
      }
    }
    if (lower.includes('mysterious') || lower.includes('eerie') || lower.includes('ominous') || lower.includes('dark')) {
      return { 
        bg: 'bg-purple-500/20', 
        text: 'text-purple-600 dark:text-purple-400', 
        border: 'border-purple-500/50',
        icon: '🔮'
      }
    }
    if (lower.includes('energetic') || lower.includes('lively') || lower.includes('bustling')) {
      return { 
        bg: 'bg-orange-500/20', 
        text: 'text-orange-600 dark:text-orange-400', 
        border: 'border-orange-500/50',
        icon: '🔥'
      }
    }
    if (lower.includes('melancholic') || lower.includes('sad') || lower.includes('somber')) {
      return { 
        bg: 'bg-blue-500/20', 
        text: 'text-blue-600 dark:text-blue-400', 
        border: 'border-blue-500/50',
        icon: '💙'
      }
    }
    
    // Default neutral
    return { 
      bg: 'bg-slate-500/20', 
      text: 'text-slate-600 dark:text-slate-400', 
      border: 'border-slate-500/50',
      icon: '📍'
    }
  }

  const theme = getMoodTheme(mood)
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border-2 ${theme.border} ${theme.bg} ${sizeClasses[size]} font-semibold ${theme.text}`}>
      <span>{theme.icon}</span>
      <span>{mood}</span>
    </div>
  )
}
