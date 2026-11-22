import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('health', () => {
  it('GET /health vrátí 200', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
  it('GET /health vrátí bezpečnostní hlavičky', async () => {
    const response = await app.request('/health')

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(response.headers.get('strict-transport-security')).toBeNull()
  })
})
