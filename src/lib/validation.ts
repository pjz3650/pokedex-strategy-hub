import { z } from 'zod';
import { GAME_IDS } from './contracts';
export const gameSchema = z.enum(GAME_IDS);
export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'A senha deve ter no máximo 72 bytes em UTF-8.',
  );
export const credentialsSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim()),
  password: passwordSchema,
});
export const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(60) });
export const memberSchema = z.object({
  formId: z.number().int().positive(),
  moves: z
    .array(z.number().int().positive())
    .max(4)
    .refine((a) => new Set(a).size === a.length, 'Movimentos duplicados.'),
  itemId: z.number().int().positive().nullish(),
  abilityId: z.number().int().positive().nullish(),
  nature: z
    .enum(['Adamant', 'Modest', 'Jolly', 'Timid', 'Bold', 'Calm', 'Impish', 'Careful', 'Hardy'])
    .nullish(),
});
export const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  gameId: gameSchema,
  mode: z.literal('story').default('story'),
  members: z.array(memberSchema).min(1).max(6),
});
export const buildSchema = z.object({
  name: z.string().trim().min(2).max(80),
  gameId: gameSchema,
  style: z.enum(['balanced', 'offensive', 'defensive', 'support']),
  member: memberSchema,
});
export const generatorSchema = z.object({
  gameId: gameSchema,
  mode: z.literal('story').default('story'),
  stage: z.number().int().min(0).max(3),
  dlc: z.boolean(),
  ignoreProgress: z.boolean(),
  style: z.enum(['balanced', 'offensive', 'defensive', 'support']),
  required: z.array(z.number().int().positive()).max(6),
  banned: z.array(z.number().int().positive()).max(100),
  size: z.number().int().min(1).max(6),
  variant: z.number().int().min(0).max(1000).optional(),
});
