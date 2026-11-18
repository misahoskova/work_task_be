import { Hono } from 'hono'
import { database } from '../db/index.js'
import {
  team,
  person,
  positionEnum,
  project,
  projectPerson,
  projectTeam,
} from '../db/schema.js'
import z from 'zod'
import { validate, idParamSchema } from '../lib/validation.js'
import { eq, getTableColumns } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

export const personsRouter = new Hono()

const personSchema = z.object({
  name: z.string().trim().min(1).max(200),
  surname: z.string().trim().min(1).max(200),
  email: z.email().trim().min(1).max(200),
  position: z.enum(positionEnum.enumValues),
  teamId: z.number().int().positive(),
})

const personUpdateSchema = personSchema.partial()

personsRouter.get('/', async (c) => {
  const rows = await database.select().from(person)
  return c.json(rows)
})

personsRouter.get('/:id', validate('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const [foundPerson] = await database
    .select()
    .from(person)
    .where(eq(person.id, id))

  if (!foundPerson) {
    throw new HTTPException(404, { message: 'Osoba nebyla nalezena' })
  }

  const [foundTeam] = await database
    .select()
    .from(team)
    .where(eq(team.id, foundPerson.teamId))

  const directProjects = await database
    .select(getTableColumns(project))
    .from(projectPerson)
    .innerJoin(project, eq(projectPerson.projectId, project.id))
    .where(eq(projectPerson.personId, id))

  const teamProjects = await database
    .select(getTableColumns(project))
    .from(projectTeam)
    .innerJoin(project, eq(projectTeam.projectId, project.id))
    .where(eq(projectTeam.teamId, foundPerson.teamId))

  // Projekt může osoba mít přímo i přes svůj tým. Z projektů týmu se berou
  // jen ty, které mezi přímo přiřazenými nejsou, aby byl každý v seznamu jednou.

  const extraProjects = teamProjects.filter(
    (teamProject) =>
      !directProjects.some(
        (directProject) => directProject.id === teamProject.id,
      ),
  )

  const projects = [...directProjects, ...extraProjects]

  return c.json({ ...foundPerson, team: foundTeam, projects })
})

personsRouter.post('/', validate('json', personSchema), async (c) => {
  const data = c.req.valid('json')

  const [foundTeam] = await database
    .select()
    .from(team)
    .where(eq(team.id, data.teamId))

  if (!foundTeam) {
    throw new HTTPException(400, { message: 'Tým nebyl nalezen' })
  }

  const [foundEmail] = await database
    .select()
    .from(person)
    .where(eq(person.email, data.email))

  if (foundEmail !== undefined) {
    throw new HTTPException(409, { message: 'Email už existuje' })
  }

  const [created] = await database.insert(person).values(data).returning()
  return c.json(created, 201)
})

personsRouter.patch(
  '/:id',
  validate('param', idParamSchema),
  validate('json', personUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')

    // Schéma pro úpravu má všechna pole nepovinná, takže validací projde
    // i prázdné tělo. Bez údajů ale není co upravit.

    if (Object.keys(data).length === 0) {
      throw new HTTPException(400, {
        message: 'Požadavek neobsahuje žádné údaje k úpravě',
      })
    }

    if (data.teamId !== undefined) {
      const [foundTeam] = await database
        .select()
        .from(team)
        .where(eq(team.id, data.teamId))

      if (!foundTeam) {
        throw new HTTPException(400, { message: 'Tým nebyl nalezen' })
      }
    }

    if (data.email !== undefined) {
      const [foundEmail] = await database
        .select()
        .from(person)
        .where(eq(person.email, data.email))

      // Stejný e-mail může mít jen upravovaná osoba. Konflikt nastane,
      // až když patří někomu jinému.

      if (foundEmail !== undefined && foundEmail.id !== id) {
        throw new HTTPException(409, { message: 'Zadaný email už existuje' })
      }
    }

    const [updated] = await database
      .update(person)
      .set(data)
      .where(eq(person.id, id))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: 'Osoba nebyla nalezena' })
    }

    return c.json(updated)
  },
)

personsRouter.delete('/:id', validate('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const [deleted] = await database
    .delete(person)
    .where(eq(person.id, id))
    .returning()

  if (!deleted) {
    throw new HTTPException(404, { message: 'Osoba nebyla nalezena' })
  }

  return c.body(null, 204)
})
