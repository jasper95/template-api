import jwt from 'jsonwebtoken'
import pathToRegexp from 'path-to-regexp'
import { RouteConfig, Request, AuthSession, Response, RouteMethod } from 'types'
import { Next } from 'restify'
import serviceLocator from 'utils/serviceLocator'

const public_routes: RouteConfig = {
  get: ['/utility/health-check', '/api-docs'],
  post: [],
  put: [],
  delete: [],
}

const no_user_routes: RouteConfig = {
  get: ['/auth/csrf', '/auth/validate-token'],
  post: ['/auth/signup', '/auth/login', '/auth/forgot-password'],
  put: ['/user', '/auth/reset-password', '/auth/verify-account'],
  delete: [],
}

function matchRoutes(routes: RouteConfig, req: Request) {
  const method = req.method.toLowerCase() as RouteMethod
  return routes[method].some((pathname: string) => pathToRegexp(pathname).test(req.getPath()))
}

export default async function authMiddleware(req: Request, res: Response, next: Next) {
  const DB = serviceLocator.get('DB')
  const logger = serviceLocator.get('logger')
  req.authenticated = true
  const { authorization, referer } = req.headers
  if (matchRoutes(public_routes, req) || req.getPath().includes('/api-docs/')) {
    return next()
  }
  let error = ''
  let token = authorization && authorization.includes('Bearer') ? authorization.replace('Bearer ', '') : ''
  if (req.cookies.access_token) {
    token = req.cookies.access_token
  }
  let invalid_token = false
  if (token) {
    try {
      const { id, user_id } = jwt.verify(token, process.env.AUTH_SECRET) as AuthSession
      const [session, user] = await Promise.all([DB.find('auth_session', id), DB.find('user', user_id)])
      if (!session || session.status !== 'Active') {
        error = 'Invalid token'
        invalid_token = true
      } else if (session) {
        req.user = user
        req.session = session
      }
      if (user) {
        req.user = user
      } else {
        error = 'Invalid token'
        invalid_token = true
      }
    } catch (err) {
      error = 'Invalid access token'
      invalid_token = true
    }
  }
  if (!matchRoutes(public_routes, req) && !referer?.includes('/api-docs') && process.env.NODE_ENV !== 'test') {
    if (
      req.username !== process.env.BASIC_USERNAME ||
      req.authorization?.basic?.password !== process.env.BASIC_PASSWORD
    ) {
      error = 'Authorization is required'
    }
  }
  if (!matchRoutes(no_user_routes, req) && !matchRoutes(public_routes, req)) {
    if (!req.user) {
      error = 'Authorization is required'
    }
    req.user_is_required = true
  }
  if (error) {
    if (invalid_token && req?.cookies?.access_token) {
      res.clearCookie('access_token', { path: '/' })
    }
    logger.warn('Authorization Middleware [Error: %s]', error)
    return res.send(401, { code: 'Unauthorized', message: error })
  }
  return next()
}
