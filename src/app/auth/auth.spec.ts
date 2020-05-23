import setupTestServer from 'scripts/setupTestServer'
import { SuperTest, Test } from 'supertest'

describe('Authentication Routes', () => {
  let request: SuperTest<Test>
  let token: string

  beforeAll(async () => {
    ;({ request, token } = await setupTestServer())
  })

  test('Should retrieve session', async () => {
    const response = await request.get('/auth/session').set('Cookie', [`access_token=${token}`])
    expect(response.status).toBe(200)
  })
})
