import { serve } from '@hono/node-server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { app } from './app.js'
import { db } from './db/index.js'

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
