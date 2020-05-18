import { ServiceLocator, ModelService } from 'types'
import QueryWrapper from '../dbwrapper'
import Knex from 'knex'
import serviceLocator from 'utils/serviceLocator'

export default class AppService {
  protected DB: QueryWrapper
  protected Model: ModelService
  protected serviceLocator: ServiceLocator
  protected knex: Knex

  constructor() {
    this.serviceLocator = serviceLocator
    this.DB = serviceLocator.get('DB')
    this.knex = serviceLocator.get('knex')
    this.Model = serviceLocator.get('Model')
  }
}
