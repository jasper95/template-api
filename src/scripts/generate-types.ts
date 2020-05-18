import 'utils/globals'
import { compile } from 'json-schema-to-typescript'
import { JSONSchema4 } from 'json-schema'
import { transformColumnsToJsonSchema } from 'utils/dbwrapper/util'
import schema from 'schema'
import path from 'path'
import fse from 'fs-extra'
import serviceLocator from 'utils/serviceLocator'

const options = {
  bannerComment: '',
  strictIndexSignatures: true,
  style: {
    semi: false,
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 120,
    tabWidth: 2,
  },
}
const logger = serviceLocator.get('logger')
export default async function generateTypes() {
  await fse.ensureDir(path.join(__dirname, '..', 'types', 'generated'))
  await Promise.all([generateValidators(), generateModels()])
  logger.info('Model Types and Schema successfully generated')
}

async function generateValidators() {
  const app_path = path.join(__dirname, '..', 'app')
  const modules = fs.readdirAsync(app_path)
  const validators = await Promise.map(modules, async (mod: string) => {
    try {
      const validator = require(path.join(app_path, mod, 'validator')).default
      const ts_validators = await Promise.map(Object.entries(validator), ([, val]: [string, JSONSchema4]) => {
        return compile(val, val.title, options)
      })
      return ts_validators.filter(Boolean).join('\n')
    } catch (err) {}
  })
  return fs.writeFileAsync(
    path.join(__dirname, '..', 'types', 'generated', 'validators.d.ts'),
    validators.join('\n'),
    'utf-8',
  )
}

async function generateModels() {
  const models = await Promise.map(schema, async table => {
    const schema = (transformColumnsToJsonSchema(table.columns) as unknown) as JSONSchema4
    const ts = await compile(schema, table.table_name, options)
    return ts
  })
  return fs.writeFileAsync(path.join(__dirname, '..', 'types', 'generated', 'models.d.ts'), models.join('\n'), 'utf-8')
}
