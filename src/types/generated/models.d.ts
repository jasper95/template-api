export interface Token {
  id?: string
  created_date?: string
  updated_date?: string
  status?: string
  type: string
  expiry?: string
  used?: boolean
  [k: string]: any | undefined
}

export interface User {
  id?: string
  created_date?: string
  updated_date?: string
  status?: string
  name: string
  email: string
  verified?: boolean
  first_name?: string
  last_name?: string
  role: 'Admin'
  last_login_date?: string
  old_user_id?: number
  [k: string]: any | undefined
}

export interface UserAuth {
  id?: string
  created_date?: string
  updated_date?: string
  status?: string
  user_id: string
  password: string
  [k: string]: any | undefined
}

export interface AuthSession {
  id?: string
  created_date?: string
  updated_date?: string
  status?: string
  user_id: string
  device_type: string
  [k: string]: any | undefined
}
