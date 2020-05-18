export interface LoginSchema {
  email: string
  password: string
  [k: string]: any | undefined
}

export interface SignupSchema {
  email: string
  password: string
  last_name: string
  role: 'Admin'
  [k: string]: any | undefined
}

export interface ForgotPasswordSchema {
  username: string
  [k: string]: any | undefined
}

export interface ResetPasswordSchema {
  password: string
  token?: string
  [k: string]: any | undefined
}



