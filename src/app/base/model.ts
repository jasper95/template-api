import { difference, uniq, get, intersection } from 'lodash'
import AppService from 'utils/base/AppService'
import { QueryBuilder } from 'knex'
import { User } from 'types'
import schema from 'schema'
import { ForbiddenError } from 'restify-errors'
import { ADMIN_ROLES } from 'utils/decorators/RouteAccessRoles'
import { views } from 'config/sql'

type addRemoveChildrenToParentsParams = {
  node: string
  parents: string[]
  children: string[]
  action?: 'add' | 'remove'
  children_key: string
}
const USER_RELATED_VIEWS = []
const USER_TABLES = ['user']
class BaseModel extends AppService {
  async addRemoveChildrenToParents(params: addRemoveChildrenToParentsParams) {
    const { node, parents, children, children_key, action = 'add' } = params
    const filter = (q: QueryBuilder) => {
      q.whereIn('id', parents)
    }
    let parent_records = await this.DB.filter<{ id: string }>(node, filter, { fields: ['id', children_key] })
    if (action === 'add') {
      parent_records = parent_records.map(e => ({
        ...e,
        [children_key]: uniq(get(e, children_key, []).concat(children)),
      }))
    } else {
      parent_records = parent_records.map(e => ({
        ...e,
        [children_key]: difference(get(e, children_key, []), children),
      }))
    }
    return this.DB.updateById(node, parent_records, ['id', children_key])
  }

  validateUnique(table: string, filters: { [key: string]: string | number }) {
    const query = this.knex(table)
    return Object.entries(filters).reduce((acc, [key, val], index) => {
      const where = index === 0 ? 'where' : 'orWhere'
      if (typeof val === 'string') {
        val = val.toLowerCase()
        acc = acc[where](this.knex.raw(`LOWER("${key}") = ?`, val))
      } else {
        acc = acc[where](this.knex.raw(`${key} = ?`, val))
      }
      return acc
    }, query)
  }

  getRoleListFilter(table_name: string, user: User) {
    const table = schema.find(e => e.table_name === table_name)
    const { role } = user
    if (!ADMIN_ROLES.includes(role) && USER_TABLES.includes(table?.table_name)) {
      return {
        id: user.id,
      }
    } else {
      if (
        table?.columns.map(e => e.column_name).includes('participant_id') ||
        USER_RELATED_VIEWS.includes(table_name)
      ) {
        return {
          participant_id: user.id,
        }
      }
    }
    if (table && !table.list_roles.includes(role)) {
      throw new ForbiddenError('Not Enough Access Rights')
    }
    return {}
  }

  validateRoleMutation(user: User) {
    if (!ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenError('Not Enough Access Rights')
    }
  }

  validateGetDetails(id: string, table_name: string, user: User) {
    if (!ADMIN_ROLES.includes(user.role) && USER_TABLES.includes(table_name) && id !== user.id) {
      throw new ForbiddenError('Not Enough Access Rights')
    }
  }

  getAllowedFields(table_name: string, user: User, fields: string[]) {
    const table = schema.find(e => e.table_name === table_name)
    let filtered_fields: string[] = []
    if (!table) {
      const view = views.find(e => e.name === table_name)
      filtered_fields = view?.allowed_fields?.[user.role]
    } else {
      filtered_fields = table.allowed_fields?.[user.role]
    }
    // no filter declared
    if (!filtered_fields) {
      // allow all fields
      if (fields.length) return fields
      return filtered_fields
    }
    // filters declared
    filtered_fields = ['id'].concat(filtered_fields)
    if (fields.length) {
      return fields.filter(e => filtered_fields.includes(e))
    }
    return filtered_fields
  }
}

export default BaseModel
