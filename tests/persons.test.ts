import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { createTeam, createPerson } from './helpers'

describe('persons', () => {
  it('POST /persons vytvoří osobu', async () => {
    const teamResponse = await createTeam('Foxtrot')
    const team = await teamResponse.json()
    const response = await createPerson(team.id, 'jana.novakova@example.cz')
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.email).toBe('jana.novakova@example.cz')
  })
  it('POST /persons s existujícím emailem vyhodí error 409', async () => {
    const teamResponse = await createTeam('Golf')
    const team = await teamResponse.json()

    await createPerson(team.id, 'jana.novakova@example.cz')

    const response = await createPerson(team.id, 'jana.novakova@example.cz')

    expect(response.status).toBe(409)
  })
  it('POST /persons s neexistujícím týmem vyhodí error 400', async () => {
    const personResponse = await createPerson(999, 'jana.novakova@example.cz')

    expect(personResponse.status).toBe(400)
  })
  it('GET /persons/:id vrátí 200 s názvem týmu', async () => {
    const teamResponse = await createTeam('Hotel')
    const team = await teamResponse.json()
    const personResponse = await createPerson(
      team.id,
      'jana.novakova@example.cz',
    )
    const person = await personResponse.json()
    const response = await app.request(`/persons/${person.id}`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.team.name).toBe('Hotel')
  })
  it('PATCH /persons/:id změní pozici', async () => {
    const teamResponse = await createTeam('India')
    const team = await teamResponse.json()
    const personResponse = await createPerson(
      team.id,
      'jana.novakova@example.cz',
    )
    const person = await personResponse.json()
    const response = await app.request(`/persons/${person.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: 'tester' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.position).toBe('tester')
  })
  it('DELETE /persons/:id smaže osobu', async () => {
    const teamResponse = await createTeam('Juliet')
    const team = await teamResponse.json()
    const personResponse = await createPerson(
      team.id,
      'jana.novakova@example.cz',
    )
    const person = await personResponse.json()
    const response = await app.request(`/persons/${person.id}`, {
      method: 'DELETE',
    })

    const getResponse = await app.request(`/persons/${person.id}`)

    expect(response.status).toBe(204)
    expect(getResponse.status).toBe(404)
  })
  it('DELETE /teams/:id nesmaže tým se členkou', async () => {
    const teamResponse = await createTeam('Kilo')
    const team = await teamResponse.json()
    await createPerson(team.id, 'jana.novakova@example.cz')
    const response = await app.request(`/teams/${team.id}`, {
      method: 'DELETE',
    })

    expect(response.status).toBe(409)
  })
  it('POST /persons s teamId mimo rozsah vrátí validation error', async () => {
    const response = await createPerson(3000000000, 'jana.novakova@example.cz')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
  })
  it('souběžné POST /persons se stejným e-mailem neskončí chybou 500', async () => {
    const teamResponse = await createTeam('Lima')
    const team = await teamResponse.json()

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        createPerson(team.id, 'jana.novakova@example.cz'),
      ),
    )
    const statuses = responses.map((response) => response.status)

    expect(statuses).not.toContain(500)
    expect(statuses.filter((status) => status === 201)).toHaveLength(1)
  })
})
