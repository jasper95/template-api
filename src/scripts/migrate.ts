import 'utils/globals'
import { SchemaBuilder } from 'utils/dbwrapper'
import { schema, database } from 'config'
import { views, functions } from 'config/sql'
import { SqlViewTemplate, SqlFunctionTemplate } from 'types'
import serviceLocator from 'utils/serviceLocator'

const logger = serviceLocator.get('logger')
export default async function migrateMain() {
  const query_wrapper = serviceLocator.get('DB')
  const { database: db_name, port, host } = database.connection
  const schema_builder = new SchemaBuilder(schema, query_wrapper)
  await dropViews()
  await schema_builder
    .setupSchema()
    .then(
      () => logger.info('Schema successfully updated', host, port, db_name),
      (err: Error) => logger.error('Error updating schema [Error: %s]', util.inspect(err)),
    )
    .then(initializeViews)
    .catch(() => process.exit(1))
}

async function dropViews() {
  const query_wrapper = serviceLocator.get('DB')
  const knex = serviceLocator.get('knex')
  const current_views = await query_wrapper.listViews()
  await Promise.mapSeries(current_views, async e => {
    logger.info('Drop View  [name: %s]', e.name)
    return knex.raw(`drop view if exists ${e.name} CASCADE`)
  }).then(
    () => logger.info('Views successfully dropped'),
    err => logger.error('Error dropping views [Error: %s]', util.inspect(err)),
  )
}
async function initializeViews() {
  const knex = serviceLocator.get('knex')
  await Promise.mapSeries(views, async e => {
    logger.info('Initialize View  [name: %s]', e.name)
    return knex.raw(getViewQuery(e))
  }).then(
    () => logger.info('Views successfully initialized'),
    err => logger.error('Error initializing views [Error: %s]', util.inspect(err)),
  )

  await Promise.mapSeries(functions, async (e: SqlFunctionTemplate) => {
    logger.info('Initialize Function  [signature: %s]', e.param_signature)
    await knex.raw(`drop function if exists ${e.name}`)
    const q = getFunctionQuery(e)
    return knex.raw(q)
  }).then(
    () => logger.info('Functions successfully initialized'),
    err => logger.error('Error initializing functions [Error: %s]', util.inspect(err)),
  )
}

function getViewQuery({ name, query }: SqlViewTemplate) {
  return `create or replace view ${name} as ${query}`
}
function getFunctionQuery({ return_signature, query, param_signature }: SqlFunctionTemplate) {
  return `
    create or replace function ${param_signature}
    returns ${return_signature} AS $$
      ${query}
    $$ LANGUAGE sql STABLE;
  `
}
