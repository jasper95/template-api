import restify from 'restify'
import { auth, cors, requestLogger, versioning, cookies, csrf } from './middlewares'

const APP_NAME = process.env.npm_package_name

const server = restify.createServer({
  name: APP_NAME,
  version: process.env.npm_package_version,
})

server.pre(versioning())
server.pre(requestLogger)
server.pre(cors.preflight)
server.use(cors.actual)
server.use(cookies)
server.use(csrf())
server.use(restify.plugins.fullResponse())
server.use(restify.plugins.acceptParser(server.acceptable))
server.use(restify.plugins.queryParser({ mapParams: true }))
server.use(restify.plugins.bodyParser({ mapParams: true }))
server.use(restify.plugins.authorizationParser())
server.use(auth)
server.get('/static/*', restify.plugins.serveStaticFiles('./mnt'))

export default server
