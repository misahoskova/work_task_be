import { Hono } from 'hono'
import { db } from '../db/index.js'
import {
  person,
  project,
  projectPerson,
  stateEnum,
  projectTeam,
  team,
} from '../db/schema.js'
import z from 'zod'
import { validate, idParamSchema } from '../lib/validation.js'
import { and, eq, getTableColumns } from 'drizzle-orm'
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

const projectPersonParamSchema = idParamSchema.extend({
  personId: z.coerce.number().int().positive().max(2147483647),
})

const projectTeamParamSchema = idParamSchema.extend({
  teamId: z.coerce.number().int().positive().max(2147483647),
})

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

  const teams = await db
    .select({
      id: team.id,
      name: team.name,
    })
    .from(projectTeam)
    .innerJoin(team, eq(projectTeam.teamId, team.id))
    .where(eq(projectTeam.projectId, id))

  const directPersons = await db
    .select(getTableColumns(person))
    .from(projectPerson)
    .innerJoin(person, eq(projectPerson.personId, person.id))
    .where(eq(projectPerson.projectId, id))

  const teamPersons = await db
    .select(getTableColumns(person))
    .from(projectTeam)
    .innerJoin(person, eq(projectTeam.teamId, person.teamId))
    .where(eq(projectTeam.projectId, id))

  const extraPersons = teamPersons.filter(
    (teamPerson) =>
      !directPersons.some((directPerson) => directPerson.id === teamPerson.id),
  )

  const participants = [...directPersons, ...extraPersons]

  return c.json({ ...foundProject, teams, participants })
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

projectsRouter.put(
  '/:id/persons/:personId',
  validate('param', projectPersonParamSchema),
  async (c) => {
    const { id, personId } = c.req.valid('param')

    const [foundProject] = await db
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const [foundPerson] = await db
      .select()
      .from(person)
      .where(eq(person.id, personId))

    if (!foundPerson) {
      throw new HTTPException(404, { message: 'Osoba nebyla nalezena' })
    }

    await db
      .insert(projectPerson)
      .values({
        projectId: id,
        personId,
      })
      .onConflictDoNothing()

    return c.body(null, 204)
  },
)

projectsRouter.delete(
  '/:id/persons/:personId',
  validate('param', projectPersonParamSchema),
  async (c) => {
    const { id, personId } = c.req.valid('param')

    const [deleted] = await db
      .delete(projectPerson)
      .where(
        and(
          eq(projectPerson.projectId, id),
          eq(projectPerson.personId, personId),
        ),
      )
      .returning()

    if (!deleted) {
      throw new HTTPException(404, {
        message: 'Přiřazení nebylo nalezeno',
      })
    }

    return c.body(null, 204)
  },
)

projectsRouter.put(
  '/:id/teams/:teamId',
  validate('param', projectTeamParamSchema),
  async (c) => {
    const { id, teamId } = c.req.valid('param')

    const [foundProject] = await db
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const [foundTeam] = await db.select().from(team).where(eq(team.id, teamId))

    if (!foundTeam) {
      throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
    }

    await db
      .insert(projectTeam)
      .values({
        projectId: id,
        teamId,
      })
      .onConflictDoNothing()

    return c.body(null, 204)
  },
)

projectsRouter.delete(
  '/:id/teams/:teamId',
  validate('param', projectTeamParamSchema),
  async (c) => {
    const { id, teamId } = c.req.valid('param')

    const [deleted] = await db
      .delete(projectTeam)
      .where(and(eq(projectTeam.projectId, id), eq(projectTeam.teamId, teamId)))
      .returning()

    if (!deleted) {
      throw new HTTPException(404, {
        message: 'Přiřazení nebylo nalezeno',
      })
    }

    return c.body(null, 204)
  },
)
