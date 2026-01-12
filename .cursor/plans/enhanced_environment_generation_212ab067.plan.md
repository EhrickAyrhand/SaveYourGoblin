---
name: Enhanced Environment Generation
overview: Update environment generation with improved prompt structure that adds Current Conflict and Adventure Hooks fields, and improves section separation to reduce repetition.
todos:
  - id: update-environment-type
    content: Add currentConflict and adventureHooks fields to Environment interface in types/rpg.ts
    status: completed
  - id: update-environment-schema
    content: Update environmentSchema in lib/ai.ts to include currentConflict and adventureHooks fields
    status: completed
  - id: update-environment-prompt
    content: Replace environment generation prompt in lib/ai.ts with improved version emphasizing section separation and adding new fields
    status: completed
  - id: update-environment-card-ui
    content: Add Current Conflict and Adventure Hooks sections to environment-card.tsx component
    status: completed
  - id: update-mock-environment
    content: Update generateMockEnvironment function to include currentConflict and adventureHooks
    status: completed
---

# Enhanced Environment Generation

## Overview

Update the environment generation system to use the improved prompt structure that emphasizes clear section separation, adds actionable gameplay elements (Current Conflict, Adventure Hooks), and reduces repetition.

## Changes Required

### 1. Update Environment Type Definition

**File**: `types/rpg.ts`

Add two new optional fields to the `Environment` interface:

- `currentConflict?: string` - What is currently wrong or unstable in this location
- `adventureHooks?: string[]` - 2-3 concrete hooks that can immediately involve the players

### 2. Update Environment Schema

**File**: `lib/ai.ts`

Update the `environmentSchema` Zod schema to include:

- `currentConflict: z.string().optional()` - Description of current conflict or instability
- `adventureHooks: z.array(z.string()).optional()` - Array of adventure hooks

Update the `npcs` field description to emphasize including role descriptions: "List of NPCs present, each with name and short role description (e.g., 'Guard Captain - Oversees the gate security')"

### 3. Update Environment Generation Prompt

**File**: `lib/ai.ts`

Replace the current environment prompt with the improved version that:

- Clearly separates Description (visual only), Atmosphere, Mood, and Lighting
- Explicitly instructs to avoid repetition between sections
- Adds instructions for Current Conflict and Adventure Hooks
- Emphasizes NPCs should include role descriptions

The new prompt structure:

```
Create a D&D 5e environment/location based on this scenario: "${scenario}"

Generate a complete location with the following clearly separated sections:

- Name: A memorable and unique location name
- Description: A vivid visual description of the place (do NOT describe mood or lighting here)
- Atmosphere: Ambient sounds, smells, and environmental details
- Mood: The emotional tone players should feel upon entering (keep this distinct from the description)
- Lighting: Lighting conditions and visibility (do NOT repeat description text)
- Notable Features: Interactive elements players can investigate or use
- NPCs: Key NPCs present, each with a short role description
- Current Conflict: What is currently wrong or unstable in this location
- Adventure Hooks: 2-3 concrete hooks that can immediately involve the players

Make the environment feel immersive, playable, and ready to use at the table.
Avoid repeating the same text across sections.
```

### 4. Update Environment Card Component

**File**: `components/rpg/environment-card.tsx`

Add display sections for the new fields:

- **Current Conflict**: Display as a new section after Features, before NPCs
- **Adventure Hooks**: Display as a new section after NPCs, styled similar to Features (grid layout with cards/badges)

Update the component structure to show:

1. Name (header)
2. Description
3. Atmosphere (current "Ambient Atmosphere")
4. Notable Features
5. Current Conflict (new)
6. Present NPCs (updated to show role descriptions better)
7. Adventure Hooks (new)
8. Mood & Lighting Summary (footer)

### 5. Update Mock Environment Generator

**File**: `lib/ai.ts`

Update `generateMockEnvironment` function to include the new fields:

- Add `currentConflict` based on scenario context
- Add `adventureHooks` array with 2-3 hooks relevant to the scenario
- Update NPCs to include role descriptions in the string format

## Implementation Notes

- All new fields are optional to maintain backward compatibility with existing generated content
- NPCs remain as `string[]` but the prompt will instruct to include role descriptions in format: "Name - Role description"
- The improved prompt emphasizes separation to reduce repetitive text between Description, Mood, and Lighting sections
- Adventure Hooks should be concrete and actionable, not vague suggestions

## Benefits

1. **Better Structure**: Clear separation prevents repetition between Description, Mood, and Lighting
2. **More Playable**: Current Conflict and Adventure Hooks provide immediate gameplay value
3. **Better NPCs**: Role descriptions help DMs understand NPC purpose at a glance
4. **More Actionable**: Concrete adventure hooks can be used immediately in sessions