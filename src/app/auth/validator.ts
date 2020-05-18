import { JSONSchema7 } from 'json-schema'

export const LoginValidator: JSONSchema7 = {
  type: 'object',
  title: 'LoginSchema',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
    },
    password: {
      type: 'string',
    },
  },
}

export const SignupValidator: JSONSchema7 = {
  type: 'object',
  title: 'SignupSchema',
  required: ['email', 'first_name', 'last_name', 'role', 'password'],
  properties: {
    email: {
      type: 'string',
    },
    password: {
      type: 'string',
    },
    last_name: {
      type: 'string',
    },
    role: {
      type: 'string',
      enum: ['Admin'],
    },
  },
}

export const ForgotPasswordValidator: JSONSchema7 = {
  type: 'object',
  title: 'ForgotPasswordSchema',
  required: ['username'],
  properties: {
    username: {
      type: 'string',
    },
  },
}

export const ResetPasswordValidator: JSONSchema7 = {
  type: 'object',
  title: 'ResetPasswordSchema',
  required: ['password'],
  properties: {
    password: {
      type: 'string',
    },
    token: {
      type: 'string',
    },
  },
}
export default {
  LoginValidator,
  SignupValidator,
  ForgotPasswordValidator,
  ResetPasswordValidator,
}
