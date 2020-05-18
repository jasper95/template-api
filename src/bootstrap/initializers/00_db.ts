import { database } from 'config'
import { InitializerContext } from 'types'

export default async function initializeDB(self: InitializerContext) {
  const { database: db_name, port, host } = database.connection
  self.logger.info('Connected to Database [Connection: %s:%s, Name: %s]', host, port, db_name)
}
