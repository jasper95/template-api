import path from 'path'

require('dotenv').config({ path: path.join(process.cwd(), 'environments', '.env.test') })
