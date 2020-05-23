import AppService from 'utils/base/AppService'
import { Controller } from 'utils/decorators/Controller'
import { Get, Post } from 'utils/decorators/Routes'
import { Request } from 'types'
import RouteAccessRoles from 'utils/decorators/RouteAccessRoles'
import { GET_LIST_PARAMS } from 'app/base/docs'

@Controller('/blog', 'Blog')
export default class BLogController extends AppService {
  @Get('', {
    summary: 'Custom Get Blog List',
    parameters: GET_LIST_PARAMS,
    response_schema: { type: 'array', items: { $ref: '#/components/schemas/Blog' } },
  })
  @RouteAccessRoles(['Admin'])
  getBlog({ params }: Request) {
    // custom blog list logic here
    const {
      fields = [],
      sort = [{ column: 'created_date', direction: 'desc' }],
      page,
      size,
      search,
      ...other_params
    } = params
    return this.DB.filter('blog', other_params, {
      fields,
      sort,
      pagination: { page, size },
      search,
    })
  }

  @RouteAccessRoles(['Admin'])
  @Post('', {
    summary: 'Create Blog',
    schema: { $ref: '#/components/schemas/Blog' },
    response_schema: { $ref: '#/components/schemas/Blog' },
  })
  createBlog({ params }: Request) {
    // custom blog create logic here
    return this.DB.insert('blog', params)
  }
}
