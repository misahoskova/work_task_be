import { Hono } from 'hono'
import { database } from '../db/index.js'
import { person, team } from '../db/schema.js'
import z from 'zod'
import { validate, idParamSchema } from '../lib/validation.js'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { describeRoute } from 'hono-openapi'
import {
  errorResponse,
  jsonContent,
  personResponseSchema,
  teamResponseSchema,
  validationErrorResponse,
} from '../lib/responses.js'

export const teamsRouter = new Hono()

// Skupina, pod kterou se routy týmů zobrazí v dokumentaci API.

const tags = ['Týmy']

const teamSchema = z.object({
  name: z.string().trim().min(1).max(200),
})

// Detail týmu vrací navíc seznam osob, které do týmu patří.

const teamDetailResponseSchema = teamResponseSchema.extend({
  members: z.array(personResponseSchema),
})

teamsRouter.get(
  '/',
  describeRoute({
    tags,
    summary: 'Seznam týmů',
    responses: {
      200: {
        description: 'Seznam všech týmů',
        content: jsonContent(z.array(teamResponseSchema)),
      },
    },
  }),
  async (c) => {
    const rows = await database.select().from(team).orderBy(team.name, team.id)
    return c.json(rows)
  },
)

teamsRouter.get(
  '/:id',
  describeRoute({
    tags,
    summary: 'Detail týmu',
    responses: {
      200: {
        description: 'Tým včetně osob, které do něj patří',
        content: jsonContent(teamDetailResponseSchema),
      },
      400: validationErrorResponse,
      404: errorResponse('Tým nebyl nalezen'),
    },
  }),
  validate('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    const [foundTeam] = await database
      .select()
      .from(team)
      .where(eq(team.id, id))

    if (!foundTeam) {
      throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
    }

    const personTeam = await database
      .select()
      .from(person)
      .where(eq(person.teamId, id))

    return c.json({ ...foundTeam, members: personTeam })
  },
)

teamsRouter.post(
  '/',
  describeRoute({
    tags,
    summary: 'Vytvoření týmu',
    responses: {
      201: {
        description: 'Vytvořený tým',
        content: jsonContent(teamResponseSchema),
      },
      400: validationErrorResponse,
    },
  }),
  validate('json', teamSchema),
  async (c) => {
    const data = c.req.valid('json')
    const [created] = await database.insert(team).values(data).returning()
    return c.json(created, 201)
  },
)

teamsRouter.patch(
  '/:id',
  describeRoute({
    tags,
    summary: 'Úprava týmu',
    responses: {
      200: {
        description: 'Upravený tým',
        content: jsonContent(teamResponseSchema),
      },
      400: validationErrorResponse,
      404: errorResponse('Tým nebyl nalezen'),
    },
  }),
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

teamsRouter.delete(
  '/:id',
  describeRoute({
    tags,
    summary: 'Smazání týmu',
    responses: {
      204: { description: 'Tým byl smazán' },
      400: validationErrorResponse,
      404: errorResponse('Tým nebyl nalezen'),
      409: errorResponse('Tým má přiřazené osoby, proto ho nelze smazat'),
    },
  }),
  validate('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    // Osoba musí vždy patřit do týmu, proto tým se členy smazat nejde.
    // Databáze by smazání odmítla sama, tahle kontrola vrátí srozumitelnou odpověď 409.

    const persons = await database
      .select()
      .from(person)
      .where(eq(person.teamId, id))
      .limit(1)

    if (persons.length > 0) {
      throw new HTTPException(409, { message: 'Tým má přiřazené osoby' })
    }

    const [deleted] = await database
      .delete(team)
      .where(eq(team.id, id))
      .returning()

    if (!deleted) {
      throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
    }

    return c.body(null, 204)
  },
)
