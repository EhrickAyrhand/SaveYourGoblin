/**
 * D&D 5e SRD-safe reference data
 * Canonical names match lib/ai.ts normalization where applicable.
 */

export const DND_REFERENCE = {
  /* =======================
   * CHARACTER
   * ======================= */

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

  /* =======================
   * ENVIRONMENT (ADVANCED)
   * ======================= */

  environment: {
    moods: {
      peaceful: {
        label: 'Peaceful',
        prompt: 'calm, serene, tranquil atmosphere'
      },
      mysterious: {
        label: 'Mysterious',
        prompt: 'mysterious, enigmatic, intriguing atmosphere'
      },
      dangerous: {
        label: 'Dangerous',
        prompt: 'tense, threatening, hostile atmosphere'
      },
      melancholic: {
        label: 'Melancholic',
        prompt: 'somber, reflective, sorrowful atmosphere'
      }
    },

    lighting: {
      bright: {
        label: 'Bright',
        prompt: 'bright and clear lighting'
      },
      soft_sunlight: {
        label: 'Soft Sunlight',
        prompt: 'soft sunlight filtering through the environment'
      },
      torchlight: {
        label: 'Torchlight',
        prompt: 'flickering torchlight casting dancing shadows'
      },
      moonlight: {
        label: 'Moonlight',
        prompt: 'cold moonlight illuminating the scene'
      },
      darkness: {
        label: 'Darkness',
        prompt: 'deep shadows and minimal light'
      }
    }
  }
} as const
