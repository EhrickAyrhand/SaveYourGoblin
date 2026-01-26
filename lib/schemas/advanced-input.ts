import { z } from "zod"
import { DND_REFERENCE } from "@/lib/dnd-reference"

/**
 * Zod schemas for advanced structured inputs (generator forms).
 * Used for client-side validation before the generate API call.
 */

/* =======================
   Character
======================= */
const classEnum = z.enum(DND_REFERENCE.classes)
const raceEnum = z.enum(DND_REFERENCE.races)
const backgroundEnum = z.enum(DND_REFERENCE.backgrounds)

export const advancedCharacterInputSchema = z
  .object({
    level: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Character level (1-20)"),

    class: classEnum.optional().describe("D&D 5e class"),
    race: raceEnum.optional().describe("D&D 5e race"),
    background: backgroundEnum.optional().describe("Character background"),
  })
  .strict()

/* =======================
   Environment
======================= */
const environmentMoodEnum = z.enum(
  Object.keys(DND_REFERENCE.environment.moods) as [
    keyof typeof DND_REFERENCE.environment.moods,
    ...(keyof typeof DND_REFERENCE.environment.moods)[]
  ]
)

const environmentLightingEnum = z.enum(
  Object.keys(DND_REFERENCE.environment.lighting) as [
    keyof typeof DND_REFERENCE.environment.lighting,
    ...(keyof typeof DND_REFERENCE.environment.lighting)[]
  ]
)


export const advancedEnvironmentInputSchema = z
  .object({
    mood: environmentMoodEnum
      .optional()
      .describe("Environment mood key (from DND_REFERENCE.environment.moods)"),

    lighting: environmentLightingEnum
      .optional()
      .describe("Environment lighting key (from DND_REFERENCE.environment.lighting)"),

    npcCount: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .describe("Number of NPCs (0-10)"),
  })
  .strict()



/* =======================
   Mission
======================= */
const difficultyEnum = z.enum(["easy", "medium", "hard", "deadly"])
const rewardTypeEnum = z.enum(["xp", "gold", "items"])

export const advancedMissionInputSchema = z
  .object({
    difficulty: difficultyEnum.optional().describe("Mission difficulty"),

    objectiveCount: z
      .number()
      .int()
      .min(2)
      .max(5)
      .optional()
      .describe("Number of objectives (2-5)"),

    rewardTypes: z
      .array(rewardTypeEnum)
      .optional()
      .describe("Types of rewards to include"),
  })
  .strict()

/* =======================
   Types
======================= */
export type AdvancedCharacterInputSchema = z.infer<
  typeof advancedCharacterInputSchema
>
export type AdvancedEnvironmentInputSchema = z.infer<
  typeof advancedEnvironmentInputSchema
>
export type AdvancedMissionInputSchema = z.infer<
  typeof advancedMissionInputSchema
>
