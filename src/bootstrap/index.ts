import path from 'path'
import 'utils/globals'
import 'reflect-metadata'
import { Server } from 'restify'
import logger from 'utils/logger'
import { InitializerContext } from 'types'

export default async ({ server }: { server: Server }) => {
  const dir = path.join(__dirname, './initializers')
  const context: InitializerContext = { server, logger }
  return fs
    .readdirAsync(dir)
    .then((files: string[]) => files.sort())
    .mapSeries(async (file: string) => {
      const { default: initializer } = require(`${dir}/${file}`) // eslint-disable-line
      await initializer(context)
    })
    .catch((err: Error) => logger.error(util.inspect(err)))
}
