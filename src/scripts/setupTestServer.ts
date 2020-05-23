import bootstrap from 'bootstrap'
import server from 'server'
import supertest, { SuperTest, Test } from 'supertest'
import cookie from 'cookie'
import migrateMain from './migrate'
import seedsMain from './seeds'

const Authorization = `Basic ${Buffer.from(process.env.BASIC_USERNAME + ':' + process.env.BASIC_PASSWORD).toString(
  'base64',
)}`

async function setupTestServer(
  options: { authorize?: boolean } = {},
): Promise<{ request: SuperTest<Test>; token: string }> {
  await migrateMain()
  await seedsMain()
  await bootstrap({ server })
  const request = supertest(server)
  let token: string
  const { authorize = true } = options
  if (authorize) {
    const response = await request
      .post('/auth/login')
      .set('Authorization', Authorization)
      .send({ email: 'bernalesjasper@gmail.com', password: 'test' })
    const cookies: { [key in string]: string } = cookie.parse(response?.header['set-cookie'].join(';'))
    token = cookies.access_token
  }
  return {
    request,
    token,
  }
}

export default setupTestServer
