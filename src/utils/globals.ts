const fs = require('fs')
const util = require('util')

global.Promise = require('bluebird')
global.fs = Promise.promisifyAll(fs)
global.util = util
