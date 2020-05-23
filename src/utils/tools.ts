import path from 'path'
import slugify from 'slugify'
import handlebars from 'handlebars'
import { HtmlContent } from 'types'
import bcrypt from 'bcrypt'
import serviceLocator from './serviceLocator'
import { IncomingHttpHeaders } from 'http'
import { Request } from 'types'
import { UserRole } from './decorators/RouteAccessRoles'
import { ForbiddenError } from 'restify-errors'
import { isSameDay, setDate, setYear, setMonth } from 'date-fns'
// import { isSameDay } from 'date-fns/esm'

export function generateSalt(rounds = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(rounds, (err, res) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

export function generateHash(password: string, salt: string) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, salt, (err, res) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

function proxyHandler(
  targetValue: Function,
  { prototype, target, ctx }: { prototype: string; target: object; ctx: Function },
  ...args: any[]
) {
  const logger = serviceLocator.get('logger')
  if (!prototype.includes('_')) {
    logger.info('%s - %s Params: %s', target.constructor.name, prototype, util.inspect(args, false, null))
  }
  return targetValue.apply(ctx, args)
}

export function selectJsonObject(fields: string[], alias: string[]) {
  const object = `json_build_object(${fields.map(field => `'${field}', ${alias}.${field}`).join(', ')})`
  return `${object} as ${alias}`
}

export function selectJsonArray(fields: string[], alias: string, join_column: string, result_alias: string) {
  const object = `json_build_object(${fields.map(field => `'${field}', ${alias}.${field}`).join(', ')})`
  const array = `json_agg(${object})`
  const filtered_array = `COALESCE(${array} FILTER (WHERE ${alias}.${join_column} IS NOT NULL), '[]')`
  return `${filtered_array} as ${result_alias}`
}

export function selectFields(fields: string[], alias: string) {
  return fields.map(field => `${alias}.${field}`)
}

export function createProxy<T extends object>(object: T, cb = proxyHandler) {
  const handler: ProxyHandler<T> = {
    get(target: T, prototype: string, receiver: any) {
      const targetValue = Reflect.get(target, prototype, receiver)
      if (prototype in Object.getPrototypeOf(target) && typeof targetValue === 'function') {
        return function(...args: any[]) {
          return cb(targetValue, { target, prototype, ctx: this }, ...args)
        }
      }
      return targetValue
    },
  }
  return new Proxy(object, handler)
}

export async function formatHTML(template_name: string, content: HtmlContent) {
  const file_path = path.join(process.cwd(), 'resources', 'html-templates', `${template_name}.html`)
  const html = await fs.readfileAsync(file_path, 'utf-8')
  return Object.entries(content).reduce((acc, [key, value]) => {
    acc = acc.replace(new RegExp(`\\\${\\s*${key}\\s*}`, 'g'), value)
    return acc
  }, html)
}

export function removeFromS3(file_path: string) {
  const s3 = serviceLocator.get('s3')
  const logger = serviceLocator.get('logger')
  const bucket = process.env.AWS_BUCKET
  logger.info('Delete File from s3 [bucket: %s, path: %s]', bucket, file_path)
  const params = { Bucket: bucket, Key: file_path }

  return new Promise((resolve, reject) => {
    s3.deleteObject(params, function(err, data) {
      if (err) reject(err)
      resolve(data)
    })
  })
}

export const uploadToAzure = (current_path: string, file_path: string) => {
  const client = serviceLocator.get('azure')
  const storage = process.env.AZURE_CONTAINER
  const logger = serviceLocator.get('logger')
  logger.info('Uploading File to AZURE [storage: %s, path: %s]', storage, file_path)
  return new Promise((resolve, reject) => {
    client.createBlockBlobFromLocalFile(storage, file_path, current_path, (error, result) => {
      if (error) reject(error)
      resolve(result)
    })
  })
}

export function removeFromAzure(file_path: string) {
  const client = serviceLocator.get('azure')
  const logger = serviceLocator.get('logger')
  const storage = process.env.AZURE_CONTAINER
  logger.info('Delete File from azure [storage: %s, path: %s]', storage, file_path)

  return new Promise((resolve, reject) => {
    client.deleteBlobIfExists(storage, file_path, (err, res) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

export function uploadToS3(local_file_path: string, file_path: string) {
  const stream = fs.createReadStream(local_file_path)
  const s3 = serviceLocator.get('s3')
  const logger = serviceLocator.get('logger')
  const bucket = process.env.AWS_BUCKET
  logger.info('Uploading File to s3 [bucket: %s, path: %s]', bucket, file_path)
  return new Promise((resolve, reject) => {
    s3.upload(
      {
        Bucket: bucket,
        Key: file_path,
        Body: stream,
      },
      (err: Error) => {
        if (err) {
          logger.error('Error Uplaoding to s3 [Error: %s]', err)
          reject(err)
        }
        resolve()
      },
    )
  })
}

export function arrayQuery(key: string, array: string[], operation = '&') {
  const knex = serviceLocator.get('knex')
  return knex.raw(`${key} \\?${operation} array[${array.map(e => `'${e}'`).join(',')}]`)
}

export function generateSlug(...args: string[]) {
  return slugify([...args, Math.floor(Math.random() * 90000) + 10000].join(' ')).toLowerCase()
}

export function isUuid(string: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(string)
}

export async function formatTemplate(name: string, data: HtmlContent) {
  const str = await fs.readFileAsync(path.join(process.cwd(), 'resources', 'templates', `${name}.hbs`), 'utf-8')
  return handlebars.compile(str)(data)
}

export function sendSendGridEmail(recepient: string, html: string, subject: string) {
  const sendgrid = serviceLocator.get('sendgrid')
  return sendgrid.send({
    from: {
      name: process.env.PROJECT_NAME,
      email: process.env.EMAIL_FROM,
    },
    to: recepient,
    subject,
    html,
  })
}

export function getPortaLink(headers: IncomingHttpHeaders) {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return `${protocol}://${headers.referer.split('/')[2]}`
}

export function copyDate(start: string, end: string) {
  const start_date = new Date(start)
  const end_date = new Date(end)
  const new_end = setYear(
    setMonth(setDate(end_date, start_date.getUTCDate()), start_date.getUTCMonth()),
    start_date.getUTCFullYear(),
  )
  if (!isSameDay(start_date, new_end)) {
    return setYear(setMonth(setDate(end_date, start_date.getDate()), start_date.getMonth()), start_date.getFullYear())
  }
  return new_end
}

export function validateRouteRoles(roles: UserRole[], req: Request) {
  const { user_is_required, user } = req
  if (user_is_required && !roles.includes(user?.role)) {
    throw new ForbiddenError('Not Enough Access Rights')
  }
  return Promise.resolve()
}
