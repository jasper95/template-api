import Ajv, { ErrorObject } from 'ajv'
import omitBy from 'lodash/omitBy'
import isNil from 'lodash/isNil'
import { Column, Table, Sort } from 'types'
import { JSONSchema7 } from 'json-schema'
import { BadRequestError } from 'restify-errors'

export const reverse_sort_columns = ['dob']

function formatValidationError({ errors }: { errors: ErrorObject[] }) {
  const [{ message, dataPath }] = errors
  throw new BadRequestError(`${dataPath.slice(1)} ${message}`)
}

function sanitizeData<T>(data: T, schema: JSONSchema7) {
  const object_keys = Object.entries(schema.properties)
    .filter(([, val]: [string, any]) => ['array', 'object'].includes(val.type))
    .map(([key]) => key)
  return Object.entries(data).reduce((acc: any, [key, val]) => {
    acc[key] = object_keys.includes(key) ? JSON.stringify(val) : val
    return acc
  }, {})
}

export async function validateSchema<T extends object>(
  params: { data: T; schema: JSONSchema7; action: 'create' | 'updateById' | 'updateByFilter' },
  ajv_opts = { removeAdditional: true },
): Promise<T> {
  const { data, schema, action = false } = params
  if (!schema) {
    return data
  }
  const ajv = new Ajv(ajv_opts)
  const validate = ajv.compile({
    $async: true,
    additionalProperties: false,
    ...schema,
    ...(action === 'updateById' && { required: ['id'] }),
    ...(action === 'updateByFilter' && { required: [] }),
  })
  const result = validate(removeNil(data)) as Promise<T>
  return result.then((result: T) => sanitizeData(result, schema)).catch(formatValidationError)
}

export function validateJsonSchema<T extends object>(
  data: T,
  json_schema: JSONSchema7,
  opts = { removeAdditional: false },
) {
  const ajv = new Ajv(opts)
  const validate = ajv.compile({
    $async: true,
    additionalProperties: true,
    ...json_schema,
  })
  const result = validate(removeNil(data)) as Promise<T>
  return result.catch(formatValidationError)
}

function getColumnType(column: Column): JSONSchema7 {
  const { type, schema } = column
  if (type === 'uuid') {
    return { type: 'string', format: 'uuid' }
  }
  if (type === 'decimal') {
    return { type: 'number' }
  }
  if (type === 'text') {
    return { type: 'string' }
  }
  if (['datetime', 'timestamp'].includes(type)) {
    return {
      type: 'string',
      format: 'date-time',
    }
  }
  if (type === 'jsonb') {
    return (
      schema || {
        type: 'object',
        properties: {},
      }
    )
  }
  return {
    type,
  } as JSONSchema7
}

export function transformColumnsToJsonSchema(columns: Column[]): JSONSchema7 {
  const initial: JSONSchema7 = {
    type: 'object',
    required: [],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      created_date: {
        type: 'string',
        readOnly: true,
      },
      updated_date: {
        type: 'string',
        readOnly: true,
      },
      status: {
        type: 'string',
      },
    },
  }
  return columns.reduce((acc, column) => {
    const { required, column_name, enum: enums, is_read_only } = column
    let { default: default_to } = column
    if (required) {
      acc.required.push(column_name)
    }
    acc.properties[column_name] = getColumnType(column)
    if (enums) {
      Object.assign(acc.properties[column_name], { enum: enums })
    }
    if (is_read_only !== undefined) {
      Object.assign(acc.properties[column_name], { readOnly: is_read_only })
    }
    if (default_to !== undefined) {
      if (default_to === '{}' || default_to === '[]') {
        default_to = JSON.parse(default_to)
      }
      Object.assign(acc.properties[column_name], { default: default_to })
    }
    return acc
  }, initial)
}

export function sortTables(tables: Table[]): Table[] {
  const source = tables.map(e => ({
    ...e,
    dependencies: e.columns.filter(col => col.foreign_key).map(col => col.reference_table),
  }))
  const mapped = source.reduce((mem: { [key: string]: Table & { dependencies: string[] } }, el) => {
    mem[el.table_name] = el
    return mem
  }, {})
  function inherited(i: string): string[] {
    return mapped[i].dependencies.reduce((mem, i) => {
      return [...mem, i, ...inherited(i)]
    }, [])
  }
  const ordered = source.sort((a, b) => {
    return !!~inherited(b.table_name).indexOf(a.table_name) ? -1 : 1
  })
  return ordered
}

// some sorting are reversed like birth date
export function transformSort(sort: Sort) {
  if (reverse_sort_columns.includes(sort.column)) {
    return {
      ...sort,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    }
  }
  return sort
}

function removeNil(data: object) {
  return omitBy(data, isNil)
}
