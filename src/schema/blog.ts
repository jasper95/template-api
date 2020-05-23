import { Table } from 'types'
import { ADMIN_ROLES } from 'utils/decorators/RouteAccessRoles'

const BLOG_TABLE: Table = {
  table_name: 'blog',
  list_roles: ADMIN_ROLES,
  columns: [
    {
      column_name: 'slug',
      type: 'string',
      required: true,
      unique: true,
    },
    {
      column_name: 'name',
      type: 'string',
      required: true,
    },
    {
      column_name: 'content',
      type: 'jsonb',
      default: '{}',
    },
    {
      column_name: 'excerpt',
      type: 'string',
      required: true,
    },
    {
      column_name: 'tags',
      type: 'jsonb',
      default: '[]',
    },
    {
      column_name: 'image_url',
      type: 'string',
      default: '',
      required: true,
    },
    {
      column_name: 'published_date',
      type: 'timestamp',
      type_params: [{ useTz: true }],
      required: true,
    },
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
      column_name: 'is_posted',
      type: 'boolean',
      default: false,
    },
    {
      type: 'string',
      column_name: 'type',
      default: 'blog',
    },
  ],
}

export default BLOG_TABLE
