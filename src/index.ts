import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from './db/index.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

try {
  await db.execute(sql`select 1`)
} catch (err) {
  console.error('Nepodařilo se připojit k databázi: ', err)
  process.exit(1)
}

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  },
)
