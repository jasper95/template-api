import schema from 'schema'
import { flow, camelCase, upperFirst } from 'lodash'

export const GET_BY_ID = {
  in: 'path',
  name: 'id',
  required: true,
  schema: {
    type: 'string',
    format: 'uuid',
  },
}

export const GET_BY_NODE_PATH = {
  in: 'path',
  name: 'node',
  required: true,
  schema: {
    type: 'string',
    enum: schema.filter(e => e.list_roles.length > 0).map(e => e.table_name),
  },
}

export const GET_LIST_PARAMS = [
  {
    in: 'query',
    name: 'search',
    schema: {
      type: 'string',
    },
  },
  {
    in: 'query',
    name: 'page',
    schema: {
      type: 'number',
      example: 0,
      // minimum: 0,
    },
  },
  {
    in: 'query',
    name: 'size',
    schema: {
      type: 'number',
      example: 10,
    },
  },
  {
    in: 'query',
    name: 'fields',
    schema: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  {
    in: 'query',
    name: 'sort',
    schema: {
      type: 'array',
      items: {
        $ref: '#/components/schemas/Sort',
      },
      // example: [
      //   {
      //     column: 'created_date',
      //     direction: 'desc',
      //   },
      // ],
    },
  },
]

export const GET_NODE_DETAILS_PARAMS = [GET_BY_ID, GET_BY_NODE_PATH]

export const GET_NODE_LIST_PARAMS = GET_LIST_PARAMS.concat([GET_BY_NODE_PATH])

export const NODE_SCHEMA = {
  oneOf: schema
    .filter(e => e.list_roles.length > 0)
    .map(e => ({ $ref: `#/components/schemas/${flow(camelCase, upperFirst)(e.table_name)}` })),
}

export const NODE_LIST_SCHEMA = {
  type: 'array',
  items: NODE_SCHEMA,
}

export const CREATE_NODE_BODY = {
  required: true,
  content: {
    'application/json': {
      schema: NODE_SCHEMA,
    },
  },
}

export const CREATE_NODE_BULK_BODY = {
  required: true,
  content: {
    'application/json': {
      schema: NODE_LIST_SCHEMA,
    },
  },
}
