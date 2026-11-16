import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { personsRouter } from './routes/persons.js'
import { teamsRouter } from './routes/teams.js'
import { projectsRouter } from './routes/projects.js'

export const app = new Hono()

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.route('/teams', teamsRouter)
app.route('/persons', personsRouter)
app.route('/projects', projectsRouter)

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

  console.error(err)
  return c.json(
    { code: 'server_error', message: 'Na serveru došlo k neočekávané chybě' },
    500,
  )
})
