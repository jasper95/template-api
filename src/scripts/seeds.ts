import 'utils/globals'
import path from 'path'
import { schema } from 'config'
import serviceLocator from 'utils/serviceLocator'

const seeds_folder = path.join(__dirname, '..', 'seeds')
export default async function seedsMain() {
  const DB = serviceLocator.get('DB')
  const logger = serviceLocator.get('logger')
  const seed_tables = await fs.readdirAsync(seeds_folder).map((e: string) => e.replace('.json', ''))

  const tables = schema.tables.map(e => e.table_name).filter((e: string) => seed_tables.includes(e))

  await Promise.mapSeries(tables, table => {
    const data = require(path.join(seeds_folder, table))
    return DB.upsert(table, data)
  })
    .then(() => logger.info('Seed data successfully added [Tables: %s]', tables))
    .catch(err => {
      logger.error('Error adding seed data [Error: %s]', util.inspect(err))
      // process.exit(1)
    })
}
