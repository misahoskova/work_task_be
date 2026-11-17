import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

export default async function setup() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('Chybí proměnná prostředí DATABASE_URL')
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1)

  if (!databaseName.endsWith('_test')) {
    throw new Error('Připojená databáze není testovací')
  }

  const database = drizzle(databaseUrl)

  await migrate(database, { migrationsFolder: './drizzle' })
  await database.$client.end()
}
