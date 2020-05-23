import { InitializerContext } from 'types'
import schema from 'schema'
import { flow, upperFirst, camelCase } from 'lodash'
import { transformColumnsToJsonSchema } from 'utils/dbwrapper/util'
import * as swaggerMiddleware from 'middlewares/swagger'
import { swagger as swaggerConfig } from 'config'
import deepmerge from 'deepmerge'

export default async function initializeDocs(self: InitializerContext) {
  const options = {
    explorer: false,
    baseURL: '/api-docs',
  }
  const schemas = schema
    .filter(e => e.list_roles.length > 0)
    .reduce((acc, table) => {
      const key = flow(camelCase, upperFirst)(table.table_name)
      return {
        ...acc,
        [key]: transformColumnsToJsonSchema(table.columns),
      }
    }, {})
  const paths = Object.keys(self.api_docs).reduce((acc, tag) => {
    const routes = self.api_docs[tag]
    const result = routes.reduce((acc2, route) => {
      const { requestMethod, swagger_params = {} } = route
      const { schema, response_schema, ...rest_params } = swagger_params
      const path_vars = route.path.match(/\:([a-z]+)/g)
      let route_path = route.path
      if (path_vars) {
        route_path = path_vars.reduce((acc: string, el: string) => {
          const path_var = `{${el.replace(':', '')}}`
          return acc.replace(el, path_var)
        }, route.path)
      }
      return deepmerge(acc2, {
        [route_path]: {
          [requestMethod === 'del' ? 'delete' : requestMethod]: {
            tags: [tag],
            ...rest_params,
            ...(schema && {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema,
                  },
                },
              },
            }),
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: response_schema,
                  },
                },
              },
              400: {
                $ref: '#/components/responses/BadRequest',
              },
              401: {
                $ref: '#/components/responses/Unauthorized',
              },
              500: {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
      })
    }, {})
    return deepmerge(acc, result)
  }, {})
  swaggerConfig.paths = paths
  swaggerConfig.components = deepmerge(swaggerConfig.components, { schemas })
  const { server } = self
  const setupMiddleware = await swaggerMiddleware.setup(swaggerConfig, options)

  server.get('/api-docs/*', ...swaggerMiddleware.serve)
  server.get('/api-docs', setupMiddleware)
}
