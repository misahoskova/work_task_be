import { app } from '../src/app'

export async function createTeam(name: string) {
  const response = await app.request('/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name }),
  })

  return response
}

export async function createPerson(teamId: number, email: string) {
  const response = await app.request('/persons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId: teamId,
      email: email,
      name: 'Jana',
      surname: 'Nováková',
      position: 'developer',
    }),
  })

  return response
}

export async function createProject(name: string) {
  const response = await app.request('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      state: 'Planned',
      startDate: '2026-11-16',
    }),
  })

  return response
}
