import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { createTeam } from './helpers'

describe('teams', () => {
  it('POST /teams vytvoří tým', async () => {
    const response = await createTeam('Alpha')
    const created = await response.json()

    expect(response.status).toBe(201)
    expect(created.name).toBe('Alpha')
  })
  it('POST /teams s prázdným názvem vrátí validation error', async () => {
    const response = await createTeam('')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.code).toBe('validation_error')
  })
  it('GET /teams/:id vrátí existující tým', async () => {
    const createResponse = await createTeam('Bravo')

    const created = await createResponse.json()
    const response = await app.request(`/teams/${created.id}`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.name).toBe('Bravo')
  })
  it('GET /teams/999 vrátí error 404', async () => {
    const response = await app.request('/teams/999')

    expect(response.status).toBe(404)
  })
  it('PATCH /teams/:id změní název týmu', async () => {
    const createResponse = await createTeam('Charlie')

    const created = await createResponse.json()
    const response = await app.request(`/teams/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Delta' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.name).toBe('Delta')
  })
  it('DELETE /teams/:id smaže tým', async () => {
    const createResponse = await createTeam('Echo')

    const created = await createResponse.json()
    const response = await app.request(`/teams/${created.id}`, {
      method: 'DELETE',
    })

    const getResponse = await app.request(`/teams/${created.id}`)

    expect(response.status).toBe(204)
    expect(getResponse.status).toBe(404)
  })
  it('GET /teams/:id s id mimo rozsah vrátí validation error', async () => {
    const response = await app.request('/teams/2147483648')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
  })
  it('POST /teams se znakem NUL v názvu vrátí 400', async () => {
    const response = await createTeam('a\u0000b')

    expect(response.status).toBe(400)
  })
})
