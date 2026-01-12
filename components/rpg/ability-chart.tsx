"use client"

interface AbilityChartProps {
  attributes: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
}

export function AbilityChart({ attributes }: AbilityChartProps) {
  // Calculate percentages (assuming max is 20, min is 1)
  const getPercentage = (value: number) => ((value - 1) / 19) * 100
  
  const abilities = [
    { name: 'STR', value: attributes.strength, color: 'bg-red-500' },
    { name: 'DEX', value: attributes.dexterity, color: 'bg-green-500' },
    { name: 'CON', value: attributes.constitution, color: 'bg-orange-500' },
    { name: 'INT', value: attributes.intelligence, color: 'bg-blue-500' },
    { name: 'WIS', value: attributes.wisdom, color: 'bg-purple-500' },
    { name: 'CHA', value: attributes.charisma, color: 'bg-yellow-500' },
  ]

  return (
    <div className="space-y-2">
      {abilities.map((ability) => (
        <div key={ability.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">{ability.name}</span>
            <span className="font-bold">{ability.value}</span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={`h-full ${ability.color} rounded-full transition-all duration-500`}
              style={{ width: `${getPercentage(ability.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
