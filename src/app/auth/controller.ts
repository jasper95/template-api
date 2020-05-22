import { generateHash, generateSalt, formatTemplate, getPortaLink, sendSendGridEmail } from 'utils/tools'
import jwt from 'jsonwebtoken'
import AppService from 'utils/base/AppService'
import { Request, AuthSession, UserAuth, User, Response, Token } from 'types'
import { Controller } from 'utils/decorators/Controller'
import { Get, Post, Put } from 'utils/decorators/Routes'
import Validator from 'utils/decorators/Validator'
import { LoginValidator, ForgotPasswordValidator, ResetPasswordValidator } from './validator'
import { BadRequestError, UnauthorizedError } from 'restify-errors'
import { QueryBuilder } from 'knex'
import { LoginSchema, ForgotPasswordSchema } from 'types'
import { isAfter } from 'date-fns'
import bcrypt from 'bcrypt'
import dayjs from 'dayjs'

@Controller('/auth', 'Authentication')
export default class UserController extends AppService {
  @Get('/csrf', { summary: 'Get csrf token' })
  async getCsrf({ csrfToken }: Request) {
    return {
      csrf: csrfToken(),
    }
  }

  @Get('/validate-token', { summary: 'Validate generated token' })
  async validateToken({ params }: Request<{ token: string; type: string }>) {
    const { token, type: type_param } = params
    try {
      const { id, type, expiry, user_id } = jwt.verify(token, process.env.AUTH_SECRET) as Token
      const record = await this.DB.find<Token>('token', id)
      if (type !== type_param || !record) {
        throw new BadRequestError('Invalid Token')
      }
      if (expiry && isAfter(new Date(expiry), new Date())) {
        throw new BadRequestError('Token expired')
      }
      if (record?.used) {
        throw new BadRequestError('Token Already used')
      }
      return { success: true }
    } catch (err) {
      throw new BadRequestError('Invalid Token')
    }
  }

  @Get('/session', { summary: 'Get logged in user session' })
  async getSession({ user }: Request) {
    if (!user) {
      throw new UnauthorizedError('Invalid token')
    }
    return user
  }

  @Post('/login', { schema: LoginValidator, summary: 'Login to authorize requests' })
  @Validator(LoginValidator)
  async login({ params }: Request<LoginSchema>, res: Response) {
    const { email, password } = params
    const filter = (query: QueryBuilder) => query.where({ email })
    const [user] = await this.DB.filter<User>('user', filter)
    if (!user) {
      throw new BadRequestError('Invalid username or password')
    }
    const { id } = user
    const [{ password: hash_password }] = await this.DB.filter<UserAuth>('user_auth', { user_id: id })
    const match = await new Promise((resolve, reject) => {
      bcrypt.compare(password, hash_password, (err, res) => {
        if (err) {
          reject(err)
        }
        resolve(res)
      })
    })
    if (!match) {
      throw new BadRequestError('Invalid username or password')
    }
    const token = await this.Model.auth.authenticateUser(user)
    await this.DB.updateById('user', { id: user.id, last_login_date: new Date().toISOString() })
    res.setCookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return user
  }

  @Post('/forgot-password', { summary: 'Send forgot password email', schema: ForgotPasswordValidator })
  @Validator(ForgotPasswordValidator)
  async forgotPassword({ params, headers }: Request<ForgotPasswordSchema>) {
    const { username } = params
    const user = await this.DB.find<User>('user', username, [], 'name')
    if (!user) {
      throw new BadRequestError('User does not exist')
    }
    const token = await this.Model.auth.generateToken({
      payload: {
        user_id: user.id,
        id: '',
      },
      type: 'reset-password',
    })
    const html = await formatTemplate('reset-password', {
      reset_link: `${getPortaLink(headers)}/reset-password?token=${token}`,
      name: user.first_name,
      project_name: process.env.PROJECT_NAME,
    })
    await sendSendGridEmail(user.email, html, `Reset ${process.env.PROJECT_NAME} account`)
    return { success: true }
  }

  @Put('/reset-password', { schema: ResetPasswordValidator, summary: 'Reset User Password' })
  @Validator(ResetPasswordValidator)
  async resetPassword({ params, user }: Request) {
    const { token, password } = params
    let user_id
    let token_id
    if (token) {
      ;({ user_id, id: token_id } = jwt.verify(token, process.env.AUTH_SECRET) as AuthSession)
      user = await this.DB.find('user', user_id)
    } else if (user) {
      user_id = user.id
    } else {
      throw new BadRequestError('Token is required')
    }
    const salt = await generateSalt()
    const new_password = await generateHash(password, salt)
    await Promise.all(
      [
        this.DB.updateByFilter('user_auth', { user_id, password: new_password }, { user_id }),
        this.DB.updateById('user', { id: user_id, verified: true }),
        token_id && this.DB.updateById('token', { id: token_id, used: true }),
      ].filter(Boolean),
    )
    const html = await formatTemplate('reset-confirmed', {
      name: user.first_name,
      template_title: 'RESET PASSWORD CONFIRMATION',
      updated_time: dayjs(new Date().toLocaleString('en-US', { timeZone: 'Canada/Eastern' })).format(
        'MM/DD/YYYY h:mm:ss A EST',
      ),
    })
    const { email } = user
    await sendSendGridEmail(email, html, `${process.env.PROJECT_NAME} Reset Password Success Confirmation`)
    return { success: true }
  }

  @Post('/logout', { summary: 'Logout current session' })
  async logout({ session }: Request, res: Response) {
    const response = await this.DB.deleteById('auth_session', session.id)
    res.clearCookie('access_token', { path: '/' })
    return response
  }
}
