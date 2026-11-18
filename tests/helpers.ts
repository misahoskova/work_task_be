import { app } from '../src/app'

/**
 * Založí tým přes `POST /teams`.
 *
 * Vrací celou odpověď, aby šel v testu zkontrolovat stavový kód
 * i přečíst založený tým přes `response.json()`.
 */

export async function createTeam(name: string) {
  const response = await app.request('/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name }),
  })

  return response
}

/**
 * Založí osobu přes `POST /persons`.
 *
 * Jméno, příjmení a pozice jsou pevně dané. Mění se jen tým a e-mail,
 * protože na nich závisí pravidla, která testy ověřují.
 */

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

/**
 * Založí projekt přes `POST /projects` se stavem `Planned`
 * a pevným datem zahájení.
 */

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
