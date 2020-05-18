import { DatabaseSchema } from 'types'
import schema from 'schema'

export default {
  db_name: process.env.DB_NAME,
  tables: schema,
} as DatabaseSchema
