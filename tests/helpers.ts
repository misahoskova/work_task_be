import { app } from '../src/app'

export async function createTeam(name: string) {
  const response = await app.request('/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name }),
  })

  return response
}
