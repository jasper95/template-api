import { database } from 'config'
import { InitializerContext } from 'types'
import serviceLocator from 'utils/serviceLocator'

export default async function initializeDB(self: InitializerContext) {
  const { database: db_name, port, host } = database.connection
  const knex = serviceLocator.get('knex')
  await knex.raw('select 1+1 as result')
  self.logger.info('Connected to Database [Connection: %s:%s, Name: %s]', host, port, db_name)
}
