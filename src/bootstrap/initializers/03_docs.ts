import { InitializerContext } from 'types'
import schema from 'schema'
import { flow, upperFirst, camelCase, get } from 'lodash'
import { transformColumnsToJsonSchema } from 'utils/dbwrapper/util'
import * as swaggerMiddleware from 'middlewares/swagger'
import { swagger as swaggerConfig } from 'config'
import deepmerge from 'deepmerge'

export default async function initializeDocs(self: InitializerContext) {
  // console.log('api_docs', util.inspect(self.api_docs, false, null))
  const options = {
    explorer: false,
    baseURL: '/api-docs',
    // swaggerOptions: {
    //   requestInterceptor: req => {
    //     if (!req.loadSpec) {
    //       const token = btoa(process.env.BASIC_USERNAME + ':' + process.env.BASIC_PASSWORD)
    //       req.headers.Authorization = 'Basic ' + token
    //     }
    //   },
    // },
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
      const { schema, ...rest_params } = swagger_params
      return deepmerge(acc2, {
        [route.path]: {
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
