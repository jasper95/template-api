import differenceBy from 'lodash/differenceBy'
import { Table, Column, DatabaseSchema } from 'types'
import QueryWrapper from './querywrapper'
const default_columns = ['id', 'status', 'created_date', 'updated_date']

class SchemaBuilder {
  schema: DatabaseSchema
  query_wrapper: QueryWrapper

  constructor(schema: DatabaseSchema, query_wrapper: QueryWrapper) {
    this.schema = schema
    this.query_wrapper = query_wrapper
  }

  async setupSchema() {
    const hasDatabase = await this.query_wrapper._checkDatabase()
    if (!hasDatabase) {
      await this.query_wrapper.createDatabase(this.schema.db_name)
    }
    const setupTables = (tables: Table[]) => Promise.mapSeries(tables, e => this.setupTable(e))
    const dropTables = (tables: string[]) => Promise.map(tables, e => this.query_wrapper.dropTable(e))
    await this.initSqlScripts()
    const current_tables = (await this.query_wrapper._listTables()).map(e => e.tablename)
    const table_names = this.schema.tables.map(e => e.table_name)
    const dropped_tables = current_tables.filter(e => !table_names.includes(e))
    await this.dropTriggers(current_tables)
    await Promise.all([setupTables(this.schema.tables), dropTables(dropped_tables)])
    await this.initTriggers(this.schema.tables)
  }

  async initSqlScripts() {
    const { knex } = this.query_wrapper
    await Promise.all([
      knex.raw('create extension if not exists "uuid-ossp"'),
      knex.raw(
        `CREATE OR REPLACE FUNCTION notify_trigger() RETURNS trigger AS $$
          DECLARE
            old_val json;
            new_val json;
          BEGIN
            IF TG_OP = 'INSERT' THEN
              new_val = row_to_json(NEW);
              old_val = null;
            ELSIF TG_OP = 'UPDATE' THEN
              old_val = row_to_json(OLD);
              new_val = row_to_json(NEW);
            ELSE
              old_val = row_to_json(OLD);
              new_val = null;
              END IF;
            PERFORM pg_notify('watchers', json_build_object('table', TG_TABLE_NAME, 'old_val', old_val, 'new_val', new_val, 'type', TG_OP)::text);
            RETURN new;
          END;
        $$ LANGUAGE plpgsql;`,
      ),
      knex.raw('create extension if not exists "unaccent"'),
    ])
    await knex.raw(`
      CREATE OR REPLACE FUNCTION slugify("value" TEXT)
      RETURNS TEXT AS $$
        -- removes accents (diacritic signs) from a given string --
        WITH "unaccented" AS (
          SELECT unaccent("value") AS "value"
        ),
        -- lowercases the string
        "lowercase" AS (
          SELECT lower("value") AS "value"
          FROM "unaccented"
        ),
        -- replaces anything that's not a letter, number, hyphen('-'), or underscore('_') with a hyphen('-')
        "hyphenated" AS (
          SELECT regexp_replace("value", '[^a-z0-9\\-_]+', '-', 'gi') AS "value"
          FROM "lowercase"
        ),
        -- trims hyphens('-') if they exist on the head or tail of the string
        "trimmed" AS (
          SELECT regexp_replace(regexp_replace("value", '\\-+$', ''), '^\\-', '') AS "value"
          FROM "hyphenated"
        )
        SELECT "value" FROM "trimmed";
      $$ LANGUAGE SQL STRICT IMMUTABLE;
    `)
    await knex.raw(`
      CREATE OR REPLACE FUNCTION set_slug_from_name() RETURNS trigger AS $$
      BEGIN
        NEW.slug := slugify(NEW.name);
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;;
    `)
  }

  initTriggers(tables: Table[]) {
    const { knex } = this.query_wrapper
    return Promise.map(tables, async ({ table_name, slug }) => {
      if (slug) {
        await knex.raw(`
            CREATE TRIGGER create_slug_trigger
            BEFORE INSERT ON "${table_name}"
            FOR EACH ROW
            WHEN (NEW.name IS NOT NULL AND NEW.slug IS NULL)
            EXECUTE PROCEDURE set_slug_from_name();`)
      }
      await knex.raw(`
        DROP TRIGGER IF EXISTS watched_table_trigger on "public"."${table_name}";
      `)
      return knex.raw(
        `CREATE TRIGGER watched_table_trigger AFTER INSERT OR UPDATE OR DELETE ON "${table_name}" FOR EACH ROW EXECUTE PROCEDURE notify_trigger();`,
      )
    })
  }

  dropTriggers(tables: string[]) {
    const { knex } = this.query_wrapper
    return Promise.map(tables, async table => {
      await knex.raw(`DROP TRIGGER IF EXISTS create_slug_trigger ON "${table}"`)
      return knex.raw(`DROP TRIGGER IF EXISTS watched_table_trigger ON "${table}"`)
    })
  }

  async setupTable(table: Table) {
    const { table_name, slug } = table
    let { columns } = table
    if (slug) {
      columns = [
        ...columns,
        {
          column_name: 'slug',
          type: 'string',
          required: true,
          unique: true,
        },
      ]
    }
    const { knex } = this.query_wrapper
    const syncColumn = (col: Column, t: any) => {
      const { type, type_params = [], column_name, default: defaultTo, required = false, unsigned = false } = col
      let query = t[type](column_name, ...[type_params])
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
      query.alter()
    }

    const hasTable = await knex.schema.hasTable(table_name)
    let new_columns = columns
    let table_columns = []
    const old_columns = differenceBy(columns, new_columns, 'column_name')
    if (hasTable) {
      ;[table_columns, new_columns] = await Promise.all([
        this.query_wrapper._listColumns(table_name),
        Promise.filter(columns, async col => !(await knex.schema.hasColumn(table_name, col.column_name))),
      ])
      const col_names = columns.map(e => e.column_name)
      const dropped_columns = table_columns.filter(e => !col_names.includes(e) && !default_columns.includes(e))
      if (dropped_columns.length) {
        await this.query_wrapper.dropColumns(table_name, dropped_columns)
      }
      const current_indices = (await this.query_wrapper._listIndices(table_name)).map(e => e.indexname)
      const current_fks = (await this.query_wrapper._listForeignKeys(table_name)).map(e => e.constraint_name)
      await Promise.map(old_columns, col => this.updateIndex(table_name, col, current_indices))
      await Promise.map(old_columns, col => this.updateUnique(table_name, col, current_indices))
      await Promise.map(old_columns, col => this.updateForeignKey(table_name, col, current_fks))
      await knex.schema.alterTable(table_name, t => {
        old_columns.map(col => syncColumn(col, t))
      })
    } else {
      await this.query_wrapper.createTable(table_name)
    }
    if (new_columns.length) {
      await this.query_wrapper.createColumns(table_name, new_columns)
    }
  }

  async updateForeignKey(table_name: string, col: Column, current_fks: string[]) {
    const { column_name, foreign_key } = col
    const indexname = `${table_name}_${column_name}_foreign`.toLowerCase()
    if (current_fks.includes(indexname) && !foreign_key) {
      await this.query_wrapper.dropForeignKey(table_name, column_name)
    }
    if (!current_fks.includes(indexname) && foreign_key) {
      await this.query_wrapper.createForeignKey(table_name, col)
    }
  }

  async updateUnique(table_name: string, { column_name, unique }: Column, current_indices: string[]) {
    const indexname = `${table_name}_${column_name}_unique`.toLowerCase()
    if (current_indices.includes(indexname) && !unique) {
      await this.query_wrapper.dropUnique(table_name, column_name)
    }
    if (!current_indices.includes(indexname) && unique) {
      await this.query_wrapper.createUnique(table_name, column_name)
    }
  }

  async updateIndex(table_name: string, { column_name, index }: Column, current_indices: string[]) {
    const indexname = `${table_name}_${column_name}_index`.toLowerCase()
    if (current_indices.includes(indexname) && !index) {
      await this.query_wrapper.dropIndex(table_name, column_name)
    }
    if (!current_indices.includes(indexname) && index) {
      await this.query_wrapper.createIndex(table_name, column_name)
    }
  }
}

export default SchemaBuilder
