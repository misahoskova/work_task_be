import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('health', () => {
  it('GET /health vrátí 200', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
