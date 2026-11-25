import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { personsRouter } from './routes/persons.js'
import { teamsRouter } from './routes/teams.js'
import { projectsRouter } from './routes/projects.js'
import { openAPIRouteHandler } from 'hono-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { getPostgresErrorCode } from './lib/db-errors.js'
import { z } from 'zod'
import { cs } from 'zod/locales'

z.config(cs())

export const app = new Hono()

app.use(
  '*',
  cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }),
)

app.use('*', secureHeaders({ strictTransportSecurity: false }))

app.use(
  '*',
  bodyLimit({
    maxSize: 100 * 1024,
    onError: (c) =>
      c.json({ code: 'error', message: 'Tělo požadavku je příliš velké' }, 413),
  }),
)

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.route('/teams', teamsRouter)
app.route('/persons', personsRouter)
app.route('/projects', projectsRouter)

app.get(
  '/openapi',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Evidence projektů a členů týmů',
        version: '1.0.0',
        description: 'REST API pro správu projektů, osob a týmů',
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Lokální server' },
      ],
    },
  }),
)

app.get('/docs', swaggerUI({ url: '/openapi' }))

app.notFound((c) => {
  return c.json(
    { code: 'not_found', message: 'Požadovaná adresa neexistuje' },
    404,
  )
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ code: 'error', message: err.message }, err.status)
  }

  const code = getPostgresErrorCode(err)

  if (code === '23505') {
    return c.json(
      {
        code: 'error',
        message: 'Záznam se stejnou hodnotou už existuje',
      },
      409,
    )
  } else if (code === '23503') {
    return c.json(
      {
        code: 'error',
        message: 'Operaci brání vazba na jiný záznam',
      },
      409,
    )
  } else if (code?.startsWith('22')) {
    return c.json(
      {
        code: 'error',
        message: 'Neplatná hodnota',
      },
      400,
    )
  }

  console.error(err)
  return c.json(
    { code: 'server_error', message: 'Na serveru došlo k neočekávané chybě' },
    500,
  )
})
