import path from 'path'
import { createProxy } from 'utils/tools'
import { InitializerContext } from 'types'
import set from 'lodash/set'
import serviceLocator from 'utils/serviceLocator'

export default async function initializeModels(self: InitializerContext) {
  const app_path = path.join(__dirname, '..', '..', 'app')
  const model = {}
  const initModels = async (module_name: string) => {
    try {
      const service = new (require(path.join(app_path, module_name, 'model')).default)(self)
      const proxy = createProxy(service)
      set(model, module_name, proxy)
    } catch (err) {
      // module does not exists
    }
  }
  serviceLocator.registerService('Model', model)
  return fs
    .readdirAsync(app_path)
    .map(initModels)
    .then(() => self.logger.info('Models successfully initialized'))
}
