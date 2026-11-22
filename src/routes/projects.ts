import { Hono } from 'hono'
import { database } from '../db/index.js'
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

export const projectsRouter = new Hono()

// Skupina, pod kterou se routy projektů zobrazí v dokumentaci API.

const tags = ['Projekty']

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

// Účastník projektu je osoba doplněná o údaj, jestli je k projektu
// přiřazená přímo nebo je na něm jen jako člen přiřazeného týmu.

const participantResponseSchema = personResponseSchema.extend({
  direct: z.boolean().meta({ example: true }),
})

// Detail projektu vrací navíc přiřazené týmy a všechny účastníky,
// tedy osoby přiřazené přímo i členy přiřazených týmů.

const projectDetailResponseSchema = projectResponseSchema.extend({
  team: teamResponseSchema,
  persons: z.array(participantResponseSchema),
})

projectsRouter.get(
  '/',
  describeRoute({
    tags,
    summary: 'Seznam projektů',
    responses: {
      200: {
        description: 'Seznam všech projektů',
        content: jsonContent(z.array(projectResponseSchema)),
      },
    },
  }),
  async (c) => {
    const rows = await database.select().from(project)
    return c.json(rows)
  },
)

projectsRouter.get(
  '/:id',
  describeRoute({
    tags,
    summary: 'Detail projektu',
    responses: {
      200: {
        description: 'Projekt včetně přiřazených týmů a osob',
        content: jsonContent(projectDetailResponseSchema),
      },
      400: validationErrorResponse,
      404: errorResponse('Projekt nebyl nalezen'),
    },
  }),
  validate('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    const [foundProject] = await database
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const teams = await database
      .select({
        id: team.id,
        name: team.name,
      })
      .from(projectTeam)
      .innerJoin(team, eq(projectTeam.teamId, team.id))
      .where(eq(projectTeam.projectId, id))

    const directPersons = await database
      .select(getTableColumns(person))
      .from(projectPerson)
      .innerJoin(person, eq(projectPerson.personId, person.id))
      .where(eq(projectPerson.projectId, id))

    const teamPersons = await database
      .select(getTableColumns(person))
      .from(projectTeam)
      .innerJoin(person, eq(projectTeam.teamId, person.teamId))
      .where(eq(projectTeam.projectId, id))

    // Osoba může být na projektu přímo i jako člen přiřazeného týmu.
    // Ze členů týmů se proto berou jen ti, kteří mezi přímo přiřazenými nejsou,
    // aby byl každý účastník v seznamu jednou.

    const extraPersons = teamPersons.filter(
      (teamPerson) =>
        !directPersons.some(
          (directPerson) => directPerson.id === teamPerson.id,
        ),
    )

    const participants = [
      ...directPersons.map((person) => ({ ...person, direct: true })),
      ...extraPersons.map((person) => ({ ...person, direct: false })),
    ]

    return c.json({ ...foundProject, teams, participants })
  },
)

projectsRouter.post(
  '/',
  describeRoute({
    tags,
    summary: 'Vytvoření projektu',
    responses: {
      201: {
        description: 'Vytvořený projekt',
        content: jsonContent(projectResponseSchema),
      },
      400: badRequestResponse(
        'Neplatný vstup, nebo datum ukončení předchází datu zahájení',
      ),
    },
  }),
  validate('json', projectSchema),
  async (c) => {
    const data = c.req.valid('json')

    if (data.endDate && data.endDate < data.startDate) {
      throw new HTTPException(400, {
        message: 'Ukončení projektu nemůže být dřív než jeho začátek',
      })
    }

    const [created] = await database.insert(project).values(data).returning()
    return c.json(created, 201)
  },
)

projectsRouter.patch(
  '/:id',
  describeRoute({
    tags,
    summary: 'Úprava projektu',
    description: 'Stačí poslat jen pole, která se mají změnit.',
    responses: {
      200: {
        description: 'Upravený projekt',
        content: jsonContent(projectResponseSchema),
      },
      400: badRequestResponse(
        'Neplatný vstup, prázdné tělo požadavku, nebo datum ukončení předchází datu zahájení',
      ),
      404: errorResponse('Projekt nebyl nalezen'),
    },
  }),
  validate('param', idParamSchema),
  validate('json', projectUpdateSchema),
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

    const [foundProject] = await database
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const startDate = data.startDate ?? foundProject.startDate

    // undefined znamená, že datum ukončení v požadavku nepřišlo a platí uložené.
    // null znamená, že se má datum ukončení vymazat.

    const endDate =
      data.endDate !== undefined ? data.endDate : foundProject.endDate

    if (endDate && endDate < startDate) {
      throw new HTTPException(400, {
        message: 'Ukončení projektu nemůže být dřív než jeho začátek',
      })
    }

    const [updated] = await database
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

projectsRouter.delete(
  '/:id',
  describeRoute({
    tags,
    summary: 'Smazání projektu',
    description: 'Spolu s projektem se smažou i přiřazení týmů a osob.',
    responses: {
      204: { description: 'Projekt byl smazán' },
      400: validationErrorResponse,
      404: errorResponse('Projekt nebyl nalezen'),
    },
  }),
  validate('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    const [deleted] = await database
      .delete(project)
      .where(eq(project.id, id))
      .returning()

    if (!deleted) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    return c.body(null, 204)
  },
)

projectsRouter.put(
  '/:id/persons/:personId',
  describeRoute({
    tags,
    summary: 'Přiřazení osoby k projektu',
    description:
      'Pokud je osoba k projektu už přiřazena, požadavek nic nezmění a vrátí 204.',
    responses: {
      204: { description: 'Osoba byla k projektu přiřazena' },
      400: validationErrorResponse,
      404: errorResponse('Projekt nebo osoba nebyly nalezeny'),
    },
  }),
  validate('param', projectPersonParamSchema),
  async (c) => {
    const { id, personId } = c.req.valid('param')

    const [foundProject] = await database
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const [foundPerson] = await database
      .select()
      .from(person)
      .where(eq(person.id, personId))

    if (!foundPerson) {
      throw new HTTPException(404, { message: 'Osoba nebyla nalezena' })
    }

    await database
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
  describeRoute({
    tags,
    summary: 'Odebrání osoby z projektu',
    responses: {
      204: { description: 'Osoba byla z projektu odebrána' },
      400: validationErrorResponse,
      404: errorResponse('Přiřazení k projektu nebylo nalezeno'),
    },
  }),
  validate('param', projectPersonParamSchema),
  async (c) => {
    const { id, personId } = c.req.valid('param')

    const [deleted] = await database
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
  describeRoute({
    tags,
    summary: 'Přiřazení týmu k projektu',
    description:
      'Pokud je tým k projektu už přiřazen, požadavek nic nezmění a vrátí 204.',
    responses: {
      204: { description: 'Tým byl k projektu přiřazen' },
      400: validationErrorResponse,
      404: errorResponse('Projekt nebo tým nebyly nalezeny'),
    },
  }),
  validate('param', projectTeamParamSchema),
  async (c) => {
    const { id, teamId } = c.req.valid('param')

    const [foundProject] = await database
      .select()
      .from(project)
      .where(eq(project.id, id))

    if (!foundProject) {
      throw new HTTPException(404, { message: 'Projekt nebyl nalezen' })
    }

    const [foundTeam] = await database
      .select()
      .from(team)
      .where(eq(team.id, teamId))

    if (!foundTeam) {
      throw new HTTPException(404, { message: 'Tým nebyl nalezen' })
    }

    await database
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
  describeRoute({
    tags,
    summary: 'Odebrání týmu z projektu',
    responses: {
      204: { description: 'Tým byl z projektu odebrán' },
      400: validationErrorResponse,
      404: errorResponse('Přiřazení k projektu nebylo nalezeno'),
    },
  }),
  validate('param', projectTeamParamSchema),
  async (c) => {
    const { id, teamId } = c.req.valid('param')

    const [deleted] = await database
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
