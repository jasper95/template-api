import { Request } from 'types'
import AppService from 'utils/base/AppService'
import { Controller } from 'utils/decorators/Controller'
import { Get, Post, Put, Delete } from 'utils/decorators/Routes'
import { NotFoundError } from 'restify-errors'
import {
  GET_NODE_DETAILS_PARAMS,
  GET_NODE_LIST_PARAMS,
  CREATE_NODE_BODY,
  GET_BY_NODE_PATH,
  NODE_LIST_SCHEMA,
  NODE_SCHEMA,
  CREATE_NODE_BULK_BODY,
} from './docs'

@Controller('/base/:node', 'Base')
export default class BaseController extends AppService {
  @Get('', { parameters: GET_NODE_LIST_PARAMS, response_schema: NODE_LIST_SCHEMA })
  async getNodeList({ params, user }: Request) {
    const {
      node,
      fields = [],
      sort = [{ column: 'created_date', direction: 'desc' }],
      page,
      size,
      search,
      ...other_params
    } = params
    const table_name = node.replace(/-/g, '_')
    const filters = { ...other_params, ...this.Model.base.getRoleListFilter(table_name, user) }
    const filtered_fields = this.Model.base.getAllowedFields(table_name, user, fields)
    return this.DB.filter(table_name, filters, { fields: filtered_fields, sort, pagination: { page, size }, search })
  }

  @Get('/:id', { parameters: GET_NODE_DETAILS_PARAMS, response_schema: NODE_SCHEMA })
  async getNodeDetails({ params, user }: Request) {
    const { node, id } = params
    const table_name = node.replace(/-/g, '_')
    this.Model.base.validateGetDetails(id, table_name, user)
    const record = await this.DB.find(table_name, id, this.Model.base.getAllowedFields(table_name, user, []))
    if (!record) {
      throw new NotFoundError('Resource not found')
    }
    return record
  }

  @Post('', { requestBody: CREATE_NODE_BODY, parameters: [GET_BY_NODE_PATH], response_schema: NODE_SCHEMA })
  async createNode({ params, user }: Request) {
    const { node } = params
    this.Model.base.validateRoleMutation(user)
    if (user) {
      params.user_id = user.id
    }
    return this.DB.insert(node.replace(/-/g, '_'), params)
  }

  @Post('/bulk', { requestBody: CREATE_NODE_BULK_BODY, response_schema: NODE_LIST_SCHEMA })
  async bulkCreate({ params, user }: Request) {
    const { node, data } = params
    this.Model.base.validateRoleMutation(user)
    return this.DB.insert(node.replace(/-/g, '_'), data)
  }

  @Put('/:id', { parameters: GET_NODE_DETAILS_PARAMS, response_schema: NODE_SCHEMA })
  async updateNode({ params, user }: Request) {
    const { node, id } = params
    const table_name = node.replace(/-/g, '_')
    this.Model.base.validateGetDetails(id, table_name, user)
    return this.DB.updateById(table_name, params)
  }

  @Delete('/:id', { parameters: GET_NODE_DETAILS_PARAMS })
  async deleteNode({ params, user }: Request) {
    const { node, id } = params
    this.Model.base.validateRoleMutation(user)
    const entity = node.replace(/-/g, '_')
    if (id === 'bulk') {
      const { ids } = params
      return this.DB.deleteById(entity, ids)
    }
    return this.DB.deleteById(entity, id)
  }
}
