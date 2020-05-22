import { Table } from 'types'
import { ADMIN_ROLES } from 'utils/decorators/RouteAccessRoles'

const USER_TABLE: Table = {
  table_name: 'user',
  list_roles: ADMIN_ROLES,
  columns: [
    {
      column_name: 'name',
      type: 'string',
      required: true,
      unique: true,
    },
    {
      column_name: 'email',
      type: 'string',
      required: true,
      index: true,
    },
    {
      column_name: 'verified',
      type: 'boolean',
      default: false,
    },
    {
      column_name: 'first_name',
      type: 'string',
      // required: true,
      default: '',
    },
    {
      column_name: 'last_name',
      type: 'string',
      // required: true,
      default: '',
    },
    {
      column_name: 'role',
      type: 'string',
      required: true,
      default: '',
      enum: ['Admin'],
    },
    {
      column_name: 'last_login_date',
      type: 'timestamp',
      type_params: [{ useTz: true }],
      is_read_only: true,
    },
    {
      column_name: 'old_user_id',
      type: 'integer',
      default: 0,
      // required: true,
    },
  ],
}

export default USER_TABLE
