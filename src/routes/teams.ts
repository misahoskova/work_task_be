import { Hono } from 'hono'
import { database } from '../db/index.js'
import { person, team } from '../db/schema.js'
import z from 'zod'
import { validate, idParamSchema } from '../lib/validation.js'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

export const teamsRouter = new Hono()

const teamSchema = z.object({
  name: z.string().trim().min(1).max(200),
})

teamsRouter.get('/', async (c) => {
  const rows = await database.select().from(team)
  return c.json(rows)
})

teamsRouter.get('/:id', validate('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const [foundTeam] = await database.select().from(team).where(eq(team.id, id))

  if (!foundTeam) {
    throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
  }

  const personTeam = await database.select().from(person).where(eq(person.teamId, id))

  return c.json({ ...foundTeam, team: personTeam })
})

teamsRouter.post('/', validate('json', teamSchema), async (c) => {
  const data = c.req.valid('json')
  const [created] = await database.insert(team).values(data).returning()
  return c.json(created, 201)
})

teamsRouter.patch(
  '/:id',
  validate('param', idParamSchema),
  validate('json', teamSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')

    const [updated] = await database
      .update(team)
      .set(data)
      .where(eq(team.id, id))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
    }

    return c.json(updated)
  },
)

teamsRouter.delete('/:id', validate('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const persons = await database
    .select()
    .from(person)
    .where(eq(person.teamId, id))
    .limit(1)

  if (persons.length > 0) {
    throw new HTTPException(409, { message: 'Tým má přiřazené osoby' })
  }

  const [deleted] = await database.delete(team).where(eq(team.id, id)).returning()

  if (!deleted) {
    throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
  }

  return c.body(null, 204)
})
