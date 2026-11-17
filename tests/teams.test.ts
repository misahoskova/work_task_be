import { describe, expect, it } from 'vitest'
import { app } from '../src/app'

describe('teams', () => {
  it('POST /teams vytvoří tým', async () => {
    const response = await app.request('/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alpha' }),
    })

    expect(response.status).toBe(201)

    const created = await response.json()
    expect(created.name).toBe('Alpha')
  })
})
