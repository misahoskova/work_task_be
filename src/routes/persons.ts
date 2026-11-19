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
import { describeRoute } from 'hono-openapi'
import {
  badRequestResponse,
  errorResponse,
  jsonContent,
  personResponseSchema,
  projectResponseSchema,
  teamResponseSchema,
  validationErrorResponse,
} from '../lib/responses.js'

export const personsRouter = new Hono()

// Skupina, pod kterou se routy osob zobrazí v dokumentaci API.

const tags = ['Osoby']

const personSchema = z.object({
  name: z.string().trim().min(1).max(200),
  surname: z.string().trim().min(1).max(200),
  email: z.email().trim().min(1).max(200),
  position: z.enum(positionEnum.enumValues),
  teamId: z.number().int().positive(),
})

const personUpdateSchema = personSchema.partial()

// Detail osoby vrací navíc její tým a projekty, na kterých se podílí.

const personDetailResponseSchema = personResponseSchema.extend({
  team: teamResponseSchema,
  projects: z.array(projectResponseSchema),
})

personsRouter.get(
  '/',
  describeRoute({
    tags,
    summary: 'Seznam osob',
    responses: {
      200: {
        description: 'Seznam všech osob',
        content: jsonContent(z.array(personResponseSchema)),
      },
    },
  }),
  async (c) => {
    const rows = await database.select().from(person)
    return c.json(rows)
  },
)

personsRouter.get(
  '/:id',
  describeRoute({
    tags,
    summary: 'Detail osoby',
    responses: {
      200: {
        description:
          'Osoba včetně svého týmu a projektů přiřazených přímo i přes tým',
        content: jsonContent(personDetailResponseSchema),
      },
      400: validationErrorResponse,
      404: errorResponse('Osoba nebyla nalezena'),
    },
  }),
  validate('param', idParamSchema),
  async (c) => {
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
  },
)

personsRouter.post(
  '/',
  describeRoute({
    tags,
    summary: 'Vytvoření osoby',
    responses: {
      201: {
        description: 'Vytvořená osoba',
        content: jsonContent(personResponseSchema),
      },
      400: badRequestResponse(
        'Neplatný vstup, nebo tým se zadaným teamId neexistuje',
      ),
      409: errorResponse('Osoba se zadaným e-mailem už existuje'),
    },
  }),
  validate('json', personSchema),
  async (c) => {
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
  },
)

personsRouter.patch(
  '/:id',
  describeRoute({
    tags,
    summary: 'Úprava osoby',
    description: 'Stačí poslat jen pole, která se mají změnit.',
    responses: {
      200: {
        description: 'Upravená osoba',
        content: jsonContent(personResponseSchema),
      },
      400: badRequestResponse(
        'Neplatný vstup, prázdné tělo požadavku, nebo tým se zadaným teamId neexistuje',
      ),
      404: errorResponse('Osoba nebyla nalezena'),
      409: errorResponse('Zadaný e-mail už má jiná osoba'),
    },
  }),
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

personsRouter.delete(
  '/:id',
  describeRoute({
    tags,
    summary: 'Smazání osoby',
    description: 'Spolu s osobou se smažou i její přiřazení k projektům.',
    responses: {
      204: { description: 'Osoba byla smazána' },
      400: validationErrorResponse,
      404: errorResponse('Osoba nebyla nalezena'),
    },
  }),
  validate('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    const [deleted] = await database
      .delete(person)
      .where(eq(person.id, id))
      .returning()

    if (!deleted) {
      throw new HTTPException(404, { message: 'Osoba nebyla nalezena' })
    }

    return c.body(null, 204)
  },
)
