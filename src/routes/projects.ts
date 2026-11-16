import { Hono } from 'hono'
import { db } from '../db/index.js'
import { project, stateEnum } from '../db/schema.js'
import z from 'zod'
import { validate, idParamSchema } from '../lib/validation.js'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

export const projectsRouter = new Hono()

const projectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().nullable().optional(),
  state: z.enum(stateEnum.enumValues),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable().optional(),
})

const projectUpdateSchema = projectSchema.partial()

projectsRouter.get('/', async (c) => {
  const rows = await db.select().from(project)
  return c.json(rows)
})

projectsRouter.get('/:id', validate('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const [foundProject] = await db
    .select()
    .from(project)
    .where(eq(project.id, id))

  if (!foundProject) {
    throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
  }

  return c.json(foundProject)
})

projectsRouter.post('/', validate('json', projectSchema), async (c) => {
  const data = c.req.valid('json')

  if (data.endDate && data.endDate < data.startDate) {
    throw new HTTPException(400, {
      message: 'Ukončení projektu nemůže být dřív než jeho začátek',
    })
  }

  const [created] = await db.insert(project).values(data).returning()
  return c.json(created, 201)
})

projectsRouter.patch(
  '/:id',
  validate('param', idParamSchema),
  validate('json', projectUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')

    if (Object.keys(data).length === 0) {
      throw new HTTPException(400, {
        message: 'Požadavek neobsahuje žádné údaje k úpravě',
      })
    }

    const [foundProject] = await db
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const startDate = data.startDate ?? foundProject.startDate
    const endDate =
      data.endDate !== undefined ? data.endDate : foundProject.endDate

    if (endDate && endDate < startDate) {
      throw new HTTPException(400, {
        message: 'Ukončení projektu nemůže být dřív než jeho začátek',
      })
    }

    const [updated] = await db
      .update(project)
      .set(data)
      .where(eq(project.id, id))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    return c.json(updated)
  },
)

projectsRouter.delete('/:id', validate('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const [deleted] = await db
    .delete(project)
    .where(eq(project.id, id))
    .returning()

  if (!deleted) {
    throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
  }

  return c.body(null, 204)
})
