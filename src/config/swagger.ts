const packageJson = require(`${process.cwd()}/package`)  // eslint-disable-line
const { name, description, author, license, version } = packageJson

export default {
  openapi: '3.0.0',
  info: {
    title: name,
    version,
    description,
    license,
    contact: author,
  },
  servers: [
    {
      url: '/v1',
      description: 'Version 1',
    },
  ],
  tags: [],
  components: {
    responses: {
      NotFound: {
        description: 'The specified resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      BadRequest: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Forbidden Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        description: 'Error response schema',
        type: 'object',
        properties: {
          code: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
        },
      },
      Sort: {
        type: 'object',
        properties: {
          column: {
            type: 'string',
          },
          direction: {
            type: 'string',
            enum: ['asc', 'desc'],
          },
        },
      },
    },
  },
}
