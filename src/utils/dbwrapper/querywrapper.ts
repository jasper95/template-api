import knex, { Config, QueryCallback, QueryBuilder } from 'knex'
import pick from 'lodash/pick'
import cloneDeep from 'lodash/cloneDeep'
import set from 'lodash/set'
import util from 'util'
import { transformColumnsToJsonSchema, validateSchema, transformSort } from './util'
import { JSONSchema7 } from 'json-schema'
import {
  TableJsonSchema,
  Column,
  Pagination,
  Sort,
  Identifiable,
  MaybeArray,
  DatabaseSchema,
  SafePartial,
  FilterType,
  Search,
  FilterOptions,
} from 'types'
import Knex from 'knex'
import { BadRequestError } from 'restify-errors'
import pg from 'pg'
pg.types.setTypeParser(20, 'text', parseInt)

class QueryWrapper {
  knex: Knex
  config: Config
  schema: TableJsonSchema[]

  constructor(schema: DatabaseSchema, config: Config) {
    this.schema = schema.tables.map(table => ({
      schema: transformColumnsToJsonSchema(table.columns),
      name: table.table_name,
    }))
    this.knex = knex(config)
    this.config = config
  }

  _checkDatabase() {
    return this.knex
      .raw('select 1+1 as result')
      .then(() => true)
      .catch(() => false)
  }

  _listTables() {
    return this.knex
      .raw("SELECT * FROM pg_catalog.pg_tables WHERE schemaname='public'")
      .then(res => res.rows) as Promise<[{ tablename: string }]>
  }

  _listIndices(table: string) {
    return this.knex.raw(`select * from pg_indexes where tablename = '${table}'`).then(res => res.rows) as Promise<
      [{ indexname: string }]
    >
  }

  _listForeignKeys(table: string) {
    return this.knex
      .raw(
        `select * from information_schema.table_constraints where table_name = '${table}' AND constraint_type = 'FOREIGN KEY'`,
      )
      .then(res => res.rows) as Promise<[{ constraint_name: string }]>
  }

  _listColumns(table: string) {
    return this.knex
      .table(table)
      .columnInfo()
      .then(res => Object.keys(res))
  }

  _getTableSchema(table: string): JSONSchema7 {
    const { schema = null } = this.schema.find(e => e.name === table) || {}
    if (!schema) {
      throw new BadRequestError(`table ${table} does not exists`)
    }
    return schema
  }

  _getTableColumns(schema: JSONSchema7) {
    if (schema) {
      return ['id', 'created_date', 'updated_date', 'status', ...Object.keys(schema.properties)]
    }
    return []
  }

  _getCommonParams(table: string, fields: string[]) {
    const schema = this._getTableSchema(table)
    const columns = fields.length > 0 ? fields : this._getTableColumns(schema)
    return { schema, columns }
  }

  _attachRecordInfo(data: any, is_update = false) {
    const args = [
      this._transformDates(data),
      !is_update && !data.created_date && { created_date: new Date().toISOString() },
      { updated_date: new Date().toISOString() },
    ].filter(Boolean)
    return Object.assign({}, ...args)
  }

  _transformDates(data: any) {
    return Object.keys(data).reduce((acc: any, el) => {
      if (data[el] instanceof Date) {
        acc[el] = data[el].toISOString()
      } else {
        acc[el] = data[el]
      }
      return acc
    }, {})
  }

  async _createOrDropDatabase(action: string) {
    const temp_config = cloneDeep({
      ...this.config,
      pool: { min: 0, max: 1 },
    })
    set(temp_config, 'connection.database', 'postgres')
    const temp_knex = knex(temp_config)
    await temp_knex.raw(action.toLowerCase()).catch(err => {
      false
    })
    temp_knex.destroy()
    return true
  }

  _withTransaction(query: QueryBuilder) {
    return this.knex.transaction(trx => query.then(trx.commit).catch(trx.rollback))
  }

  async listViews() {
    const exists = await this._checkDatabase()
    if (!exists) {
      return Promise.resolve([])
    }
    return this.knex
      .raw(`select table_name as name from INFORMATION_SCHEMA.views WHERE table_schema = ANY (current_schemas(false))`)
      .then(res => res.rows) as Promise<[{ name: string }]>
  }

  async createDatabase(database: string) {
    return this._createOrDropDatabase(`CREATE DATABASE ${database}`)
  }

  createTable(table: string) {
    return this.knex.schema.createTable(table, t => {
      t.uuid('id')
        .defaultTo(this.knex.raw('uuid_generate_v4()'))
        .primary()
      t.string('status')
        .defaultTo('Active')
        .notNullable()
      t.timestamp('created_date', { precision: 6, useTz: true }).defaultTo(this.knex.fn.now())
      t.timestamp('updated_date', { precision: 6, useTz: true }).defaultTo(this.knex.fn.now())
    })
  }

  async createColumns(table: string, columns: Column[]) {
    const initColumn = (col: Column, t: any) => {
      const {
        type,
        type_params = [],
        unique,
        column_name,
        default: defaultTo,
        required = false,
        unsigned = false,
        index,
      } = col

      let query = t[type](column_name, ...type_params) // eslint-disable-line

      if (required) {
        query = query.notNullable()
      } else {
        query = query.nullable()
      }
      if (defaultTo !== undefined) {
        query = query.defaultTo(defaultTo)
      }
      if (unsigned) {
        query = query.unsigned()
      }
      if (unique) {
        query = query.unique()
      }
      if (index) {
        query = query.index()
      }
    }
    await this.knex.schema.alterTable(table, t => {
      columns.forEach(e => initColumn(e, t))
    })
    return Promise.mapSeries(
      columns.filter(e => e.foreign_key),
      col => this.createForeignKey(table, col),
    )
  }

  createIndex(table: string, column: string) {
    return this.knex.schema.alterTable(table, t => {
      t.index([column])
    })
  }

  createUnique(table: string, column: string) {
    return this.knex.schema.alterTable(table, t => {
      t.unique([column])
    })
  }

  createForeignKey(table: string, col: Column) {
    const { column_name, on_update, on_delete, reference_table, reference_column } = col
    return this.knex.schema.table(table, t => {
      t.foreign(column_name)
        .references(reference_column)
        .inTable(reference_table)
        .onUpdate(on_update || 'NO ACTION')
        .onDelete(on_delete || 'NO ACTION')
    })
  }

  async dropDatabase(database: string) {
    return this._createOrDropDatabase(`DROP DATABASE IF EXISTS ${database}`)
  }

  dropTable(table: string) {
    return this.knex.schema.dropTable(table)
  }

  dropColumns(table: string, columns: string[]) {
    return this.knex.schema.table(table, t => {
      t.dropColumns(...columns)
    })
  }

  dropIndex(table: string, column: string) {
    return this.knex.schema.alterTable(table, t => {
      t.dropIndex(column)
    })
  }

  dropUnique(table: string, column: string) {
    return this.knex.schema.alterTable(table, t => {
      t.dropUnique([column])
    })
  }

  async dropForeignKey(table: string, column: string) {
    await this.knex.schema.table(table, t => {
      t.dropForeign([column])
    })
    return this.knex.schema.table(table, t => {
      t.dropIndex([], `${table}_${column}_foreign`.toLowerCase())
    })
  }

  async find<T = any>(table: string, id: string, fields: string[] = [], key_filter = 'id'): Promise<T> {
    const result = await this.knex(table)
      .select<T>(...fields)
      .where({ [key_filter]: id })
      .first()
    return result
  }

  filter<T extends object = any>(
    table: string,
    filter: FilterType<T>,
    options?: Omit<FilterOptions, 'pagination'>,
  ): Promise<T[]>
  filter<T extends object = any>(
    table: string,
    filter: FilterType<T>,
    options?: FilterOptions,
  ): Promise<{ data: T[]; count: number }>

  async filter<T extends object = any>(
    table: string,
    filter: FilterType<T> = {},
    options: FilterOptions = {},
  ): Promise<{ data: T[]; count: number } | T[]> {
    const pagination: Pagination = options.pagination || {}
    const sort: Sort[] = options.sort || [{ column: 'created_date', direction: 'asc' }]
    const fields: string[] = options.fields || []
    const search: Search = options.search || { fields: [], value: '' }
    const { page, size } = pagination
    let query = this.knex(table).where(filter)
    const { value: search_value = '', fields: search_fields = [] } = search || {}
    if (search_value && search_fields.length) {
      query = query.andWhere(builder => {
        return search_fields
          .filter(e => e !== 'id')
          .reduce((q, field) => {
            return q.orWhere(field, 'ilike', `%${search_value}%`)
          }, builder)
      })
    }
    if (![page, size].includes(undefined)) {
      const count = query
        .clone()
        .count()
        .then((response: [{ count: string }]) => Number(response[0].count))
      query = sort
        .map(transformSort)
        .reduce((q: QueryBuilder, sortEl: Sort) => q.orderBy(sortEl.column, sortEl.direction), query)
      query = query
        .offset(Number(page) * Number(size))
        .limit(Number(size))
        .select(...fields)

      return Promise.props({
        data: query,
        count,
      })
    }
    return sort.reduce((q, sortEl) => q.orderBy(sortEl.column, sortEl.direction), query.select(...fields))
  }

  async insert<T extends object = any>(
    table: string,
    data: SafePartial<T>,
    fields?: string[],
    options?: { batch_size: number },
  ): Promise<T>
  async insert<T extends object = any>(
    table: string,
    data: SafePartial<T>[],
    fields?: string[],
    options?: { batch_size: number },
  ): Promise<T[]>
  async insert<T extends object = any>(
    table: string,
    data: MaybeArray<SafePartial<T>>,
    fields: string[] = [],
    options = { batch_size: 1000 },
  ): Promise<MaybeArray<T>> {
    const { schema, columns } = this._getCommonParams(table, fields)
    if (Array.isArray(data)) {
      data = await Promise.map(data, e =>
        validateSchema({ data: this._attachRecordInfo(e, false), schema, action: 'create' }),
      )
      return this._withTransaction(this.knex.batchInsert(table, data, options.batch_size).returning(columns))
    }
    data = await validateSchema({ data: this._attachRecordInfo(data, false), schema, action: 'create' })
    return this.knex(table)
      .returning(columns)
      .insert<T>(data)
      .then((response: any) => response[0])
  }

  async upsert<T extends Identifiable = any>(table: string, data: MaybeArray<T>, fields: string[] = []) {
    const { schema, columns } = this._getCommonParams(table, fields)
    const validate = async (e: T) => validateSchema({ data: e, schema, action: 'create' })
    const upsertData = (e: T) => {
      const insert = this.knex(table).insert({ ...e })
      delete e.id
      const update = this.knex(table)
        .returning(columns)
        .update(e)

      const query = util.format(
        '%s on conflict (id) do update set %s',
        insert.toString(),
        update.toString().replace(/^update ([`"])[^\1]+\1 set/i, ''),
      )
      return this.knex.raw(query).then(res => res.rows[0])
    }
    if (Array.isArray(data)) {
      data = await Promise.map(data, e => validate(this._attachRecordInfo(e, true)))
      return Promise.map(data, upsertData)
    }
    data = (await validate(this._attachRecordInfo(data, true))) as T
    return upsertData(data)
  }

  async updateById<T extends Identifiable = any>(table: string, data: MaybeArray<T>, fields: string[] = []) {
    const { schema, columns } = this._getCommonParams(table, fields)
    const validate = async (e: T) => validateSchema({ data: e, schema, action: 'updateById' })
    const update = (e: T) =>
      this.knex
        .table(table)
        .where({ id: e.id })
        .update(pick(e, columns), columns)
        .then(([res]) => res)

    if (Array.isArray(data)) {
      data = await Promise.map(data, e => validate(this._attachRecordInfo(e, true)))
      return Promise.map(data, update)
    }
    data = (await validate(this._attachRecordInfo(data, true))) as T
    return update(data)
  }

  async updateByFilter<T = any>(table: string, data: T, filter: object | QueryCallback = {}, fields: string[] = []) {
    const { schema, columns } = this._getCommonParams(table, fields)
    data = await validateSchema({
      data,
      schema,
      action: 'updateByFilter',
    })
    return this._withTransaction(
      this.knex(table)
        .where(filter)
        .update(data, columns),
    )
  }

  deleteById(table: string, id: string | string[]) {
    let query = this.knex(table)
    if (Array.isArray(id)) {
      query = query.where(builder => {
        builder.whereIn('id', id)
      })
    } else {
      query = query.where({ id })
    }
    return query
      .returning('id')
      .delete()
      .then((res: any) => (Array.isArray(id) ? res : res[0]))
  }

  deleteByFilter(table: string, filter: object | QueryCallback = {}) {
    if (Object.keys(filter).length) {
      return this._withTransaction(
        this.knex(table)
          .where(filter)
          .returning('id')
          .delete(),
      )
    }
    return Promise.resolve([])
  }
}

export default QueryWrapper
