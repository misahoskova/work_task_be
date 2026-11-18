import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

/**
 * Spustí se jednou před všemi testy.
 *
 * Ověří, že testy míří na testovací databázi, a vytvoří v ní tabulky
 * spuštěním migrací.
 */

export default async function setup() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('Chybí proměnná prostředí DATABASE_URL')
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1)

  // Testy před každým během mažou obsah všech tabulek. Pojistka je proto
  // pustí jen na databázi, jejíž název končí na _test.

  if (!databaseName.endsWith('_test')) {
    throw new Error('Připojená databáze není testovací')
  }

  const database = drizzle(databaseUrl)

  await migrate(database, { migrationsFolder: './drizzle' })
  await database.$client.end()
}
