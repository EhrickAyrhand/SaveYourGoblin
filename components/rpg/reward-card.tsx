"use client"

interface RewardCardProps {
  type: 'xp' | 'gold' | 'items'
  value: number | string
  label?: string
}

export function RewardCard({ type, value, label }: RewardCardProps) {
  const config = {
    xp: {
      icon: '⭐',
      bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-500/50',
      text: 'text-yellow-600 dark:text-yellow-400',
      defaultLabel: 'Experience'
    },
    gold: {
      icon: '🪙',
      bg: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-500/50',
      text: 'text-amber-600 dark:text-amber-400',
      defaultLabel: 'Gold'
    },
    items: {
      icon: '🎒',
      bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/50',
      text: 'text-blue-600 dark:text-blue-400',
      defaultLabel: 'Items'
    },
  }

  const configData = config[type]
  const displayLabel = label || configData.defaultLabel
  const displayValue = typeof value === 'number' && type !== 'items' 
    ? value.toLocaleString() 
    : value

  return (
    <div className={`p-4 rounded-lg border-2 ${configData.border} ${configData.bg} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{configData.icon}</span>
        <span className={`text-sm font-semibold ${configData.text}`}>{displayLabel}</span>
      </div>
      <div className={`text-2xl font-display font-bold ${configData.text}`}>
        {displayValue}
        {type === 'gold' && ' gp'}
        {type === 'xp' && ' XP'}
        {type === 'items' && typeof value === 'number' && ` item${value !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}
