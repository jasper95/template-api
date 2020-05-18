import cookie from 'cookie'
import { Request, Response } from 'types'
import { Next } from 'restify'

export default function cookiesMiddleware(req: Request, res: Response, next: Next) {
  const cookie_header = req.headers.cookie

  if (cookie_header) {
    req.cookies = cookie.parse(cookie_header)
  } else {
    req.cookies = {}
  }

  res.setCookie = (key, val, opts) => {
    const HEADER = 'Set-Cookie'

    if (res.header(HEADER)) {
      let curr = res.header(HEADER)

      if (!(curr instanceof Array)) {
        curr = [curr]
      }

      curr.push(cookie.serialize(key, val, opts))

      res.setHeader(HEADER, curr)
    } else {
      res.setHeader(HEADER, cookie.serialize(key, val, opts))
    }
  }

  res.clearCookie = (key, opts = {}) => {
    const options = {
      expires: new Date(1),
      ...opts,
    }
    res.setCookie(key, '', options)
  }

  next()
}
