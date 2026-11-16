import {
  pgTable,
  varchar,
  date,
  pgEnum,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const positionEnum = pgEnum('position_enum', [
  'developer',
  'analyst',
  'project_manager',
  'tester',
])

export const stateEnum = pgEnum('state_enum', [
  'Planned',
  'In_progress',
  'Done',
])

export const person = pgTable('person', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  surname: varchar('surname', { length: 200 }).notNull(),
  email: varchar('email', { length: 200 }).unique().notNull(),
  position: positionEnum('position').notNull(),
  teamId: integer('team_id')
    .notNull()
    .references(() => team.id, { onDelete: 'restrict' }),
})

export const project = pgTable('project', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  state: stateEnum('state').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
})

export const team = pgTable('team', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 200 }).notNull(),
})

export const projectPerson = pgTable(
  'project_person',
  {
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.personId] })],
)

export const projectTeam = pgTable(
  'project_team',
  {
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    teamId: integer('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.teamId] })],
)
