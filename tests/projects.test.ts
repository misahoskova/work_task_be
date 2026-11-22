import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { createTeam, createPerson, createProject } from './helpers'

describe('projects', () => {
  it('POST /projects vytvoří projekt', async () => {
    const response = await createProject('Zulu')
    const created = await response.json()

    expect(response.status).toBe(201)
    expect(created.name).toBe('Zulu')
  })
  it('POST /projects s datem ukončení dřív než zahájení vyhodí error 400', async () => {
    const response = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Yankee',
        state: 'Done',
        startDate: '2026-11-15',
        endDate: '2026-10-15',
      }),
    })

    expect(response.status).toBe(400)
  })
  it('GET /projects/999 vrátí error 404', async () => {
    const response = await app.request('/projects/999')

    expect(response.status).toBe(404)
  })
  it('PUT /projects/:id/persons/:personId vrátí 204', async () => {
    const teamResponse = await createTeam('Lima')
    const team = await teamResponse.json()

    const personResponse = await createPerson(
      team.id,
      'jana.novakova@example.cz',
    )
    const person = await personResponse.json()

    const projectResponse = await createProject('X-ray')
    const project = await projectResponse.json()

    const response = await app.request(
      `/projects/${project.id}/persons/${person.id}`,
      { method: 'PUT' },
    )
    const detailResponse = await app.request(`/projects/${project.id}`)
    const detail = await detailResponse.json()

    expect(response.status).toBe(204)
    expect(detail.participants).toHaveLength(1)
  })
  it('PUT /projects/:id/teams/:teamId vrátí 204', async () => {
    const teamResponse = await createTeam('Mike')
    const team = await teamResponse.json()

    await createPerson(team.id, 'jana.novakova@example.cz')

    const projectResponse = await createProject('Whisky')
    const project = await projectResponse.json()

    const response = await app.request(
      `/projects/${project.id}/teams/${team.id}`,
      { method: 'PUT' },
    )
    const detailResponse = await app.request(`/projects/${project.id}`)
    const detail = await detailResponse.json()

    expect(response.status).toBe(204)
    expect(detail.participants).toHaveLength(1)
    expect(detail.teams).toHaveLength(1)
  })
  it('GET /projects/:id vrátí účastníky bez duplicit', async () => {
    const teamResponse = await createTeam('November')
    const team = await teamResponse.json()

    const personResponse = await createPerson(
      team.id,
      'jana.novakova@example.cz',
    )
    const person = await personResponse.json()

    const projectResponse = await createProject('Victor')
    const project = await projectResponse.json()

    await app.request(`/projects/${project.id}/persons/${person.id}`, {
      method: 'PUT',
    })

    await app.request(`/projects/${project.id}/teams/${team.id}`, {
      method: 'PUT',
    })

    const detailResponse = await app.request(`/projects/${project.id}`)
    const detail = await detailResponse.json()

    expect(detail.participants).toHaveLength(1)
  })
  it('DELETE /projects/:id odstraní přiřazení osob', async () => {
    const teamResponse = await createTeam('Oscar')
    const team = await teamResponse.json()
    const personResponse = await createPerson(
      team.id,
      'jana.novakova@example.cz',
    )
    const person = await personResponse.json()

    const projectResponse = await createProject('Uniform')
    const project = await projectResponse.json()

    await app.request(`/projects/${project.id}/persons/${person.id}`, {
      method: 'PUT',
    })

    const response = await app.request(`/projects/${project.id}`, {
      method: 'DELETE',
    })
    const detailResponse = await app.request(`/persons/${person.id}`)
    const detail = await detailResponse.json()

    expect(detail.projects).toHaveLength(0)
    expect(response.status).toBe(204)
  })
  it('GET /projects/:id rozlišuje přímo přiřazené účastníky a členy týmu', async () => {
    const teamOneResponse = await createTeam('Papa')
    const teamOne = await teamOneResponse.json()
    const teamTwoResponse = await createTeam('Quebec')
    const teamTwo = await teamTwoResponse.json()

    const personOneResponse = await createPerson(
      teamOne.id,
      'petra.almerova@example.cz',
    )
    const personOne = await personOneResponse.json()
    const personTwoResponse = await createPerson(
      teamTwo.id,
      'arnost.cerveny@example.cz',
    )
    const personTwo = await personTwoResponse.json()

    const projectResponse = await createProject('Tango')
    const project = await projectResponse.json()

    const assignPersonResponse = await app.request(
      `/projects/${project.id}/persons/${personOne.id}`,
      { method: 'PUT' },
    )
    expect(assignPersonResponse.status).toBe(204)

    const assignTeamResponse = await app.request(
      `/projects/${project.id}/teams/${teamTwo.id}`,
      { method: 'PUT' },
    )
    expect(assignTeamResponse.status).toBe(204)

    const projectDetailResponse = await app.request(`/projects/${project.id}`)
    const projectDetail = await projectDetailResponse.json()

    expect(projectDetail.participants).toContainEqual(
      expect.objectContaining({ id: personOne.id, direct: true }),
    )
    expect(projectDetail.participants).toContainEqual(
      expect.objectContaining({ id: personTwo.id, direct: false }),
    )
  })
})
