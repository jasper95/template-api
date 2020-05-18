import AppService from 'utils/base/AppService'
import { Controller } from 'utils/decorators/Controller'
import { Get } from 'utils/decorators/Routes'

@Controller('/utility', 'Utility')
export default class UtilityController extends AppService {
  @Get('/health-check')
  async getDatabaseStatus() {
    await this.knex.raw('select 1+1 as result')
    return {
      db_connection: 'UP',
    }
  }
}
