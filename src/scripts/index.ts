const path = require('path')
const args = process.argv.slice(2)
const script = args[0]
;(async () => {
  if (process.env.NODE_ENV === 'development') {
    require('dotenv').config({ path: path.join(process.cwd(), 'environments', `.env.${process.env.NODE_ENV}`) })
  }
  if (script === 'start') {
    require('../index')
  } else {
    await require('./' + script).default()
    process.exit(0)
  }
})()
