import { Request, Response } from 'types'
import { Next } from 'restify'
import Tokens, { Options } from 'csrf'

export default function csrfMiddleware(options?: Options) {
  const tokens = new Tokens(options || {})

  return (req: Request, res: Response, next: Next) => {
    let secret = req.cookies._csrf
    let token = ''

    req.csrfToken = () => {
      if (!secret) {
        secret = tokens.secretSync()
        res.setCookie('_csrf', secret, { path: '/', httpOnly: true })
      }
      if (token) {
        return token
      }
      token = tokens.create(secret)
      return token
    }

    if (!secret) {
      secret = tokens.secretSync()
      res.setCookie('_csrf', secret, { path: '/', httpOnly: true })
    }

    const csrf_token = req.headers['x-csrf-token'] as string
    const { referer } = req.headers
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      !tokens.verify(secret, csrf_token) &&
      !referer?.includes('/api-docs') &&
      process.env.NODE_ENV !== 'test'
    ) {
      return res.send(403, { message: 'invalid csrf token', code: 'EBADCSRFTOKEN' })
    }
    next()
  }
}
