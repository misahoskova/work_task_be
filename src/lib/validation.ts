import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'
import z from 'zod'

/**
 * Vytvoří mezikrok, který před routou zkontroluje část požadavku podle schématu zod.
 *
 * Při neplatném vstupu vrátí odpověď 400 v jednotném formátu
 * `{ code, message, details }` a routa se nespustí.
 *
 * @param target Která část požadavku se kontroluje: `json`, `param` nebo `query`.
 * @param schema Pravidla, kterým musí vstup odpovídat.
 */

export const validate = <
  T extends ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: 'validation_error',
          message: 'Neplatný vstup',
          details: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        400,
      )
    }
  })

/**
 * Schéma pro `id` z adresy, například `/teams/5`.
 *
 * Převede text z adresy na číslo a povolí jen kladná celá čísla,
 * která se vejdou do sloupce typu `integer`.
 */

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483674),
})
