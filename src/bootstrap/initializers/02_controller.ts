import path from 'path'
import { omit, groupBy } from 'lodash'
import restify, { Response, Next } from 'restify'
import { createProxy, validateRouteRoles } from 'utils/tools'
import { InitializerContext, RouteDefinition, Request, MethodRoutes, HttpMethod, ApiDocs } from 'types'
import { ControllerValidators } from 'utils/decorators/Validator'
import { validateJsonSchema } from 'utils/dbwrapper/util'
import { HttpError } from 'restify-errors'
import { ControllerRouteAccessRoles, USER_ROLES } from 'utils/decorators/RouteAccessRoles'

export default function initializeControllers(self: InitializerContext) {
  const app = path.join(__dirname, '..', '..', 'app')
  const proxyHandler = (
    targetValue: Function,
    { prototype, target }: { prototype: string; target: object },
    ...args: [Request, Response, Next]
  ) => {
    const { logger } = self
    const class_name = target.constructor.name
    const validators = Reflect.getMetadata('validators', target.constructor) as ControllerValidators
    const access_roles = Reflect.getMetadata('access_roles', target.constructor) as ControllerRouteAccessRoles
    const [req, res] = args
    const omit_params = ['base64string', 'avatar']
    const validator = validators[prototype]
    logger.info('%s - %s [Params: %s]', class_name, prototype, util.inspect(omit(req.params, omit_params), false, null))
    const validation = validator ? validateJsonSchema(req.params, validator) : Promise.resolve()
    const route_roles = access_roles[prototype] || USER_ROLES
    return validation
      .then(() => validateRouteRoles(route_roles, req))
      .then(() => targetValue.apply(target, args))
      .then((response: any) => {
        // return nothing for stream response
        if (response !== undefined) {
          res.send(200, response)
        }
      })
      .catch((err: Error) => {
        if (err instanceof HttpError) {
          logger.warn('%s - %s [Error: %s]', class_name, prototype, err.message)
          return res.send(err)
        }
        logger.error('%s - %s [Error: %s]', class_name, prototype, util.inspect(err))
        return res.send(500, { code: 'InternalServer', message: util.inspect(err) })
      })
  }

  const { server } = self
  const api_docs: ApiDocs = {}
  const initRoutes = (module_name: string) => {
    let Controller = require(path.join(app, module_name, 'controller')).default // eslint-disable-line
    const prefix = Reflect.getMetadata('prefix', Controller)
    const tag = Reflect.getMetadata('tag', Controller)
    const routes: RouteDefinition[] = Reflect.getMetadata('routes', Controller)
    const instance = createProxy(new Controller(), proxyHandler)
    const module_routes = getRoutes(prefix, routes)
    api_docs[tag] = (api_docs?.[tag] || []).concat(routes.map(e => ({ ...e, path: path.join(prefix, e.path) })))
    Object.keys(module_routes).forEach((method: HttpMethod) => {
      const method_routes = module_routes[method]
      Object.entries(method_routes).forEach(([url, url_routes]) => {
        const handlers = url_routes.map(url_route => ({ version: '1.0.0', handler: instance[url_route.methodName] }))
        server[method](url, restify.plugins.conditionalHandler(handlers))
      })
    })
  }
  return fs
    .readdirAsync(app)
    .filter((module_name: string) => module_name !== 'base')
    .map(initRoutes)
    .then(() => initRoutes('base'))
    .then(() => {
      self.api_docs = api_docs
      self.logger.info('Controllers successfully initialized')
    })
}

function getRoutes(prefix: string, routes: RouteDefinition[]) {
  const by_method = groupBy(routes, 'requestMethod')
  return Object.keys(by_method).reduce((acc: MethodRoutes, method: HttpMethod) => {
    acc[method] = groupBy(
      by_method[method].map(e => ({ ...e, path: path.join(prefix, e.path) })),
      'path',
    )
    return acc
  }, {})
}
