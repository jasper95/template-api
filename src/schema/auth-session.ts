import { Table } from 'types'

const AUTH_SESSION_TABLE: Table = {
  table_name: 'auth_session',
  list_roles: [],
  columns: [
    {
      column_name: 'user_id',
      type: 'uuid',
      foreign_key: true,
      required: true,
      reference_table: 'user',
      reference_column: 'id',
      on_update: 'CASCADE',
      on_delete: 'CASCADE',
    },
    {
      column_name: 'device_type',
      type: 'string',
      default: 'Web',
      required: true,
    },
  ],
}

export default AUTH_SESSION_TABLE
