import jwt from 'jsonwebtoken'
import dayjs from 'dayjs'
import AppService from 'utils/base/AppService'
import { AuthSession, Token, Identifiable, User } from 'types'

class AuthModel extends AppService {
  async authenticateUser(user: User) {
    const session = await this.DB.insert<AuthSession>('auth_session', { user_id: user.id, device_type: 'Web' })
    return this.generateToken({
      payload: session,
      insert_db: false,
    })
  }

  async generateToken<T extends Identifiable>(params: {
    payload: T
    insert_db?: boolean
    type?: string
    has_expiry?: boolean
  }) {
    const { payload, insert_db = true, type, has_expiry = true } = params
    if (insert_db) {
      const result = await this.DB.insert<Token>('token', {
        type,
        expiry: has_expiry
          ? dayjs()
              .add(Number(process.env.TOKEN_EXPIRY_DAYS), 'day')
              .toISOString()
          : null,
      })
      payload.id = result.id
    }
    const token = jwt.sign(
      {
        ...payload,
        ...(type && { type }),
      },
      process.env.AUTH_SECRET,
      has_expiry ? { expiresIn: `${process.env.TOKEN_EXPIRY_DAYS}d` } : {},
    )
    return token
  }
}

export default AuthModel
