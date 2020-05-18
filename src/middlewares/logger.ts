import morgan from 'morgan'
import logger from 'utils/logger'

export const requestLogger: any = morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message),
  },
  skip: req => req.getPath().includes('/api-docs'),
})

export default requestLogger
