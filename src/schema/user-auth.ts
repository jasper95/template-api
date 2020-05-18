import { Table } from 'types'

const USER_AUTH_TABLE: Table = {
  table_name: 'user_auth',
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
      column_name: 'password',
      type: 'string',
      default: '',
      required: true,
    },
  ],
}

export default USER_AUTH_TABLE
