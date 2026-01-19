import { z } from "zod"

/**
 * Zod schemas for advanced structured inputs (generator forms).
 * Used for client-side validation before the generate API call.
 */

export const advancedCharacterInputSchema = z
  .object({
    level: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Character level (1-20)"),
    class: z.string().optional().describe("D&D 5e class"),
    race: z.string().optional().describe("D&D 5e race"),
    background: z.string().optional().describe("Character background"),
  })
  .strict()

export const advancedEnvironmentInputSchema = z
  .object({
    mood: z.string().optional().describe("Desired mood"),
    lighting: z.string().optional().describe("Desired lighting"),
    npcCount: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .describe("Number of NPCs (0-10)"),
  })
  .strict()

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

export type AdvancedCharacterInputSchema = z.infer<typeof advancedCharacterInputSchema>
export type AdvancedEnvironmentInputSchema = z.infer<typeof advancedEnvironmentInputSchema>
export type AdvancedMissionInputSchema = z.infer<typeof advancedMissionInputSchema>
