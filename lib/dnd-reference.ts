/**
 * D&D 5e SRD-safe reference data for the Example List sidebar.
 * Canonical names match lib/ai.ts normalization where applicable.
 */

export const DND_REFERENCE = {
  classes: [
    'Barbarian',
    'Bard',
    'Cleric',
    'Druid',
    'Fighter',
    'Monk',
    'Paladin',
    'Ranger',
    'Rogue',
    'Sorcerer',
    'Warlock',
    'Wizard',
  ] as const,

  races: [
    'Human',
    'Elf',
    'Dwarf',
    'Halfling',
    'Dragonborn',
    'Gnome',
    'Half-Elf',
    'Half-Orc',
    'Tiefling',
  ] as const,

  backgrounds: [
    'Acolyte',
    'Charlatan',
    'Criminal',
    'Entertainer',
    'Folk Hero',
    'Guild Artisan',
    'Hermit',
    'Noble',
    'Outlander',
    'Sage',
    'Soldier',
    'Urchin',
  ] as const,

  spellsByLevel: [
    { level: 0, levelLabel: 'Cantrip', spells: ['Fire Bolt', 'Light', 'Mage Hand', 'Prestidigitation'] },
    { level: 1, levelLabel: '1st', spells: ['Magic Missile', 'Shield', 'Cure Wounds', 'Burning Hands'] },
    { level: 2, levelLabel: '2nd', spells: ['Misty Step', 'Hold Person', 'Scorching Ray'] },
    { level: 3, levelLabel: '3rd', spells: ['Fireball', 'Counterspell'] },
  ] as const,
} as const
