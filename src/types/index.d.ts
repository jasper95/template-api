import { Request as RestifyRequest, Server, plugins, RequestFileInterface, Response as RestifyResponse } from 'restify'
import { Logger } from 'winston'
import QueryWrapper from 'utils/dbwrapper'
import Knex, { ConnectionConfig as KnexConnectionConfig, Raw, QueryCallback } from 'knex'
import { User, AuthSession } from './generated/models'
import AuthModel from 'app/auth/model'
import BaseModel from 'app/base/model'
import FileModel from 'app/file/model'
import { MailService } from '@sendgrid/mail'
import S3Client from 'aws-sdk/clients/s3'
import { JSONSchema7 } from 'json-schema'
import { BlobService } from 'azure-storage'
import { UserRole } from 'utils/decorators/RouteAccessRoles'
import { SwaggerParams } from 'utils/decorators/Routes'
export * from './generated/models'
export * from './generated/validators'

export type VersioningOptions = {
  prefix?: string
}

export type MaybeArray<T> = T | T[]
export type SafePartial<T> = T extends {} ? Partial<T> : any
export type FilterType<T> = Raw<T> | SafePartial<T> | QueryCallback | Record<string, any>

export type Dictionary<T> = {
  [key: string]: T
}

export type HtmlContent = {
  [key: string]: string
}

export type MethodRoutes = {
  [key in HttpMethod]?: Dictionary<({ path: string } & RouteDefinition)[]>
}

export interface File extends RequestFileInterface {
  name: string
}

export type HttpMethod = 'get' | 'post' | 'put' | 'del'
export type RouteMethod = 'get' | 'post' | 'put' | 'delete'

export type RouteConfig = {
  [key in RouteMethod]: string[]
}

export interface ControllerRoute {
  url: string
  handlers: plugins.HandlerCandidate[]
}

export type ControllerRouteConfig = {
  [key in 'get' | 'post' | 'put' | 'del']: ControllerRoute[]
}

export interface Request<T = any> extends RestifyRequest {
  user_is_required: boolean
  authenticated: boolean
  auth_error: string
  user: User
  session: AuthSession
  params: T
  csrfToken(): string
  cookies: {
    [key: string]: string
  }
}

export interface Response extends RestifyResponse {
  setCookie(key: string, val: string, opts?: object): void
  clearCookie(key: string, opts?: object): void
}

export interface ServiceLocator {
  services: {
    DB: QueryWrapper
    knex: Knex
    logger: Logger
    sendgrid: typeof MailService
    Model?: ModelService
    s3: S3Client
    azure: BlobService
  }
  registerService(name: string, service: object): void
  get(name: 'DB'): QueryWrapper
  get(name: 'azure'): BlobService
  get(name: 'knex'): Knex
  get(name: 'sendgrid'): typeof MailService
  get(name: 'logger'): Logger
  get(name: 'Model'): ModelService
  get(name: 's3'): S3Client
}

export interface ModelService {
  auth: AuthModel
  base: BaseModel
  file: FileModel
}

export interface InitializerContext {
  server: Server
  logger: Logger
  api_docs: ApiDocs
}

export type ApiDocs = {
  [key in string]?: RouteDefinition[]
}

export interface TableJsonSchema {
  name: string
  schema: JSONSchema7
}

export interface Column {
  type: 'string' | 'jsonb' | 'boolean' | 'uuid' | 'datetime' | 'integer' | 'decimal' | 'text' | 'timestamp'
  column_name: string
  enum?: string[] | number[]
  required?: boolean
  unique?: boolean
  index?: boolean
  unsigned?: boolean
  foreign_key?: boolean
  default?: string | number | '[]' | '{}' | boolean
  reference_table?: string
  reference_column?: string
  on_delete?: string
  on_update?: string
  type_params?: any[]
  schema?: JSONSchema7
  is_read_only?: boolean
}

export interface Table {
  table_name: string
  list_roles: UserRole[]
  allowed_fields?: RoleFields
  slug?: boolean
  columns: Column[]
}

export interface DatabaseSchema {
  db_name: string
  tables: Table[]
}

export interface ConnectionConfig extends KnexConnectionConfig {
  port: number
}

export interface DBConfig {
  client: string
  connection: ConnectionConfig
}

export interface SqlViewTemplate {
  name: string
  query: string
  allowed_fields: RoleFields
}

export interface SqlFunctionTemplate {
  param_signature: string
  return_signature: string
  query: string
  name: string
}

export interface Pagination {
  page?: number
  size?: number
}

export interface Sort {
  column: string
  direction: 'asc' | 'desc'
}

export interface Search {
  value: string
  fields: string[]
}

export type SwaggerParams = {
  requestBody?: any
  parameters?: any
  description?: string
  summary?: string
  schema?: any
  response_schema?: any
}

export interface RouteDefinition {
  // Path to our route
  path: string
  // HTTP Request method (get, post, ...)
  requestMethod: HttpMethod
  // Method name within our class responsible for this route
  methodName: string

  swagger_params?: SwaggerParams
}

export interface FilterOptions {
  fields?: string[]
  sort?: Sort[]
  pagination?: Pagination
  search?: Search
}

export interface Identifiable {
  id?: string
}

export type RoleFields = {
  [key in UserRole]?: string[]
}

export type SurveyQuestion = {
  name: string
  title: string
  type: string
  labelTrue?: string
  labelFalse?: string
  rows?: { value: string; text: string }[]
  choices?: { value: string; text: string }[]
  columns?: { value: string; text: string }[]
  items?: { name: text; title: string }[]
}

export type Option = {
  text: string
  value: string
}
