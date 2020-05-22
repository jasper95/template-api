import restify, { Next } from 'restify'
import swaggerUi from 'swagger-ui-dist'
import { Request, Response } from 'types'

const readFileAsync = util.promisify(fs.readFile)
const unlinkAsync = util.promisify(fs.unlink)
const favIconHtml =
  '<link rel="icon" type="image/png" href="/api-docs/favicon-32x32.png" sizes="32x32" />' +
  '<link rel="icon" type="image/png" href="/api-docs/favicon-16x16.png" sizes="16x16" />'
let swaggerInit: string

function stringify(obj: any) {
  const placeholder = '____FUNCTIONPLACEHOLDER____'
  const fns: any = []
  let json = JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'function') {
        fns.push(value)
        return placeholder
      }
      return value
    },
    2,
  )
  json = json.replace(new RegExp(`"${placeholder}"`, 'g'), _ => fns.shift())
  return `const options = ${json};`
}

export async function generateHTML(
  swaggerDoc: any,
  opts: any,
  options?: any,
  customCss?: any,
  customfavIcon?: any,
  swaggerUrl?: any,
  customSiteTitle?: any,
) {
  let isExplorer
  let customJs
  let swaggerUrls
  let baseURL = '.'

  if (opts && typeof opts === 'object') {
    options = opts.swaggerOptions
    customCss = opts.customCss
    customJs = opts.customJs
    customfavIcon = opts.customfavIcon
    swaggerUrl = opts.swaggerUrl
    swaggerUrls = opts.swaggerUrls
    isExplorer = opts.explorer || !!swaggerUrls
    customSiteTitle = opts.customSiteTitle
    baseURL = opts.baseURL
  } else {
    // support legacy params based function
    isExplorer = opts
  }
  options = options || {}
  const explorerString = isExplorer ? '' : '.swagger-ui .topbar .download-url-wrapper { display: none }'
  customCss = `${explorerString} ${customCss}` || explorerString
  customfavIcon = customfavIcon || false
  customSiteTitle = customSiteTitle || 'Swagger UI'
  const html = await readFileAsync(`${__dirname}/indexTemplate.html.tpl`, 'utf8')
  await unlinkAsync(`${__dirname}/index.html`).catch(() => {})

  const favIconString = customfavIcon ? `<link rel="icon" href="${customfavIcon}" />` : favIconHtml
  const htmlWithBaseURL = html.replace(/{BASEURL}/g, baseURL)
  const htmlWithCustomCss = htmlWithBaseURL.replace('<% customCss %>', customCss)
  const htmlWithFavIcon = htmlWithCustomCss.replace('<% favIconString %>', favIconString)
  const htmlWithCustomJs = htmlWithFavIcon.replace(
    '<% customJs %>',
    customJs ? `<script src="${customJs}"></script>` : '',
  )

  const initOptions = {
    swaggerDoc: swaggerDoc || undefined,
    customOptions: options,
    swaggerUrl: swaggerUrl || undefined,
    swaggerUrls: swaggerUrls || undefined,
  }
  const js = await readFileAsync(`${__dirname}/swagger-ui-init.js.tpl`, 'utf8')
  swaggerInit = js.replace('<% swaggerOptions %>', stringify(initOptions))
  return htmlWithCustomJs.replace('<% title %>', customSiteTitle)
}

export async function setup(
  swaggerDoc: any,
  opts: any,
  options?: any,
  customCss?: any,
  customfavIcon?: any,
  swaggerUrl?: any,
  customSiteTitle?: any,
) {
  const htmlWithOptions = await generateHTML(
    swaggerDoc,
    opts,
    options,
    customCss,
    customfavIcon,
    swaggerUrl,
    customSiteTitle,
  )
  return (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(htmlWithOptions),
      'Content-Type': 'text/html',
    })
    res.write(htmlWithOptions)
    res.end()
  }
}

function swaggerInitFn(req: Request, res: Response, next: Next) {
  if (req.url.endsWith('/swagger-ui-init.js')) {
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(swaggerInit),
      'Content-Type': 'application/javascript',
    })
    res.write(swaggerInit)
    res.end()
  } else {
    next()
  }
}

async function swaggerInitFunction(swaggerDoc: any, opts: any) {
  const js = await readFileAsync(`${__dirname}/swagger-ui-init.js.tpl`, 'utf8')
  const swaggerInitFile = js.replace('<% swaggerOptions %>', stringify(opts))
  return function initMiddleware(req: Request, res: Response, next: Next) {
    if (req.url.endsWith('/swagger-ui-init.js')) {
      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(swaggerInitFile),
        'Content-Type': 'application/javascript',
      })
      res.write(swaggerInitFile)
      res.end()
    } else {
      next()
    }
  }
}

const swaggerAssetMiddleware = (options = {}) => {
  const extended_options = Object.assign(
    {
      directory: swaggerUi.getAbsoluteFSPath(),
      appendRequestPath: false,
    },
    options,
  )
  const staticServer = restify.plugins.serveStatic(extended_options)

  return (req: Request, res: Response, next: Next) => {
    if (/(\/|index\.html)$/.test(req.path())) {
      return next()
    }
    return staticServer(req, res, next)
  }
}

export function serveFiles(swaggerDoc: any, opts: any) {
  opts = opts || {}
  const initOptions = {
    swaggerDoc: swaggerDoc || undefined,
    customOptions: opts.swaggerOptions || {},
    swaggerUrl: opts.swaggerUrl || {},
    swaggerUrls: opts.swaggerUrls || undefined,
  }
  const swaggerInitWithOpts = swaggerInitFunction(swaggerDoc, initOptions)

  return [swaggerInitWithOpts, swaggerAssetMiddleware()]
}

export const serve = [swaggerInitFn, swaggerAssetMiddleware()]
export const serveWithOptions = (options: any) => [swaggerInitFn, swaggerAssetMiddleware(options)]
