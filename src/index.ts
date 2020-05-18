import logger from 'utils/logger'
import bootstrap from './bootstrap'
import server from './server'

const PORT = process.env.PORT || 5000
;(async () => {
  await bootstrap({ server })
  const message = `Server running on PORT ${PORT}`
  server.listen(PORT, () => logger.info(message))
})()
