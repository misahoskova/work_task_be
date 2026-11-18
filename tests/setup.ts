import { sql } from 'drizzle-orm'
import { beforeEach, afterAll } from 'vitest'
import { database } from '../src/db/index.js'

beforeEach(async () => {
  await database.execute(
    sql`TRUNCATE TABLE project_team, project_person, person, project, team RESTART IDENTITY CASCADE`,
  )
})

afterAll(async () => {
  await database.$client.end()
})
