import { Table } from 'types'

const TOKEN_TABLE: Table = {
  table_name: 'token',
  list_roles: [],
  columns: [
    {
      column_name: 'type',
      type: 'string',
      required: true,
    },
    {
      column_name: 'expiry',
      type: 'timestamp',
      type_params: [{ useTz: true }],
    },
    {
      column_name: 'used',
      type: 'boolean',
      default: false,
    },
  ],
}

export default TOKEN_TABLE
