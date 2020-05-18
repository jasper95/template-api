import semver from 'semver'
import { VersioningOptions } from 'types'
import { Request, Response, Next } from 'restify'

export default (options: VersioningOptions = {}) => {
  const { prefix = '' } = options

  return (req: Request, res: Response, next: Next) => {
    req.url = req.url.replace(prefix, '')

    const pieces = req.url.replace(/^\/+/, '').split('/')
    let version = pieces[0]

    version = version.replace(/v(\d{1})\.(\d{1})\.(\d{1})/, '$1.$2.$3')
    version = version.replace(/v(\d{1})\.(\d{1})/, '$1.$2.0')
    version = version.replace(/v(\d{1})/, '$1.0.0')

    if (semver.valid(version)) {
      req.url = req.url.substr(pieces[0].length + 1)
      req.headers = req.headers || {}
      req.headers['accept-version'] = version
    } else if (!req.headers['accept-version']) {
      req.headers['accept-version'] = '1.0.0'
    }
    next()
  }
}
