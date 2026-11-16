import { serve } from '@hono/node-server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Hono } from 'hono'
import { db } from './db/index.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

try {
  await migrate(db, { migrationsFolder: './drizzle' })
} catch (err) {
  console.error('Nepodařilo se inicializovat databázi: ', err)
  process.exit(1)
}

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Server běží na http://localhost:${info.port}`)
  },
)
