import { resolver } from 'hono-openapi'
import type { ZodType } from 'zod'
import { z } from 'zod'
import { positionEnum, stateEnum } from '../db/schema.js'

// Schémata v tomto souboru nic nevalidují. Popisují tvar odpovědí API
// a slouží jako podklad pro dokument OpenAPI na adrese /openapi.

/** Chybová odpověď ve tvaru, který vrací app.onError a app.notFound. */

export const errorSchema = z.object({
  code: z.string().meta({ example: 'error' }),
  message: z.string().meta({ example: 'Záznam nebyl nalezen' }),
})

/** Chybová odpověď při neplatném vstupu, kterou vrací funkce validate. */

export const validationErrorSchema = z.object({
  code: z.string().meta({ example: 'validation_error' }),
  message: z.string().meta({ example: 'Neplatný vstup' }),
  details: z.array(
    z.object({
      path: z.string().meta({ example: 'name' }),
      message: z.string().meta({
        example: 'Too small: expected string to have >=1 characters',
      }),
    }),
  ),
})

/** Tým tak, jak ho API vrací. */

export const teamResponseSchema = z.object({
  id: z.number().int().meta({ example: 1 }),
  name: z.string().meta({ example: 'Vývojový tým' }),
})

/** Osoba tak, jak ji API vrací. */

export const personResponseSchema = z.object({
  id: z.number().int().meta({ example: 1 }),
  name: z.string().meta({ example: 'Jana' }),
  surname: z.string().meta({ example: 'Nováková' }),
  email: z.email().meta({ example: 'jana.novakova@example.com' }),
  position: z.enum(positionEnum.enumValues),
  teamId: z.number().int().meta({ example: 1 }),
})

/** Projekt tak, jak ho API vrací. */

export const projectResponseSchema = z.object({
  id: z.number().int().meta({ example: 1 }),
  name: z.string().meta({ example: 'Evidence projektů' }),
  description: z
    .string()
    .nullable()
    .meta({ example: 'Interní aplikace pro správu projektů' }),
  state: z.enum(stateEnum.enumValues),
  startDate: z.iso.date().meta({ example: '2026-11-16' }),
  endDate: z.iso.date().nullable().meta({ example: '2026-12-31' }),
})

/**
 * Sestaví obsah odpovědi ve formátu JSON pro describeRoute.
 *
 * @param schema zod schéma popisující tělo odpovědi
 */

export const jsonContent = (schema: ZodType) => ({
  'application/json': { schema: resolver(schema) },
})

/** Odpověď 400 při neplatném vstupu, stejná u všech rout s validací. */

export const validationErrorResponse = {
  description: 'Neplatný vstup',
  content: jsonContent(validationErrorSchema),
}

/**
 * Sestaví odpověď 400 pro routy, které kromě neplatného vstupu vracejí
 * se stejným kódem i jinou chybu požadavku ve tvaru { code, message }.
 *
 * @param description popis situací, ve kterých routa odpověď 400 vrací
 */

export const badRequestResponse = (description: string) => ({
  description,
  content: jsonContent(z.union([validationErrorSchema, errorSchema])),
})

/**
 * Sestaví chybovou odpověď ve tvaru { code, message }.
 *
 * @param description popis situace, ve které routa tuto chybu vrací
 */

export const errorResponse = (description: string) => ({
  description,
  content: jsonContent(errorSchema),
})
