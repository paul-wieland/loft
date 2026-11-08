import { protocol } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

import { isValidPackageId } from '../../domain/package/package-id'
import { DESIGN_TOKENS_CSS } from './design-tokens'
import { CARD_BRIDGE_SOURCE, HOST_BRIDGE_SOURCE } from './host-bridge'

const BRIDGE_PATH = '__workplace/bridge.js'
const TOKENS_PATH = '__workplace/tokens.css'
const CARD_BRIDGE_PATH = '__workplace/card-bridge.js'

export const PACKAGE_SCHEME = 'workplace-pkg'
// A preview runs a package that is still in review. Its host is the review request id.
export const PREVIEW_SCHEME = 'workplace-preview'

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
}

export function registerPackageScheme(): void {
  protocol.registerSchemesAsPrivileged([PACKAGE_SCHEME, PREVIEW_SCHEME].map((scheme) => ({
    scheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  })))
}

export function servePackages(packagesRoot: string): void {
  protocol.handle(PACKAGE_SCHEME, (request) =>
    serve(request, PACKAGE_SCHEME, (host) => (isValidPackageId(host) ? join(packagesRoot, host) : null)),
  )
}

// Previews read the staged package, so a tool can be tried before it is approved.
export function servePreviews(stagingRoot: string): void {
  protocol.handle(PREVIEW_SCHEME, (request) =>
    serve(request, PREVIEW_SCHEME, (host) =>
      REQUEST_ID_PATTERN.test(host) ? join(stagingRoot, host, 'package') : null,
    ),
  )
}

async function serve(
  request: Request,
  scheme: string,
  packageDirFor: (host: string) => string | null,
): Promise<Response> {
  const url = new URL(request.url)
  const packageDir = packageDirFor(url.hostname)
  if (!packageDir) return notFound()

  const origin = `${scheme}://${url.hostname}`
  const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1))

  if (relativePath === 'index.html') return wrapperPage(origin, packageDir)
  if (relativePath === BRIDGE_PATH) return script(HOST_BRIDGE_SOURCE)
  if (relativePath === CARD_BRIDGE_PATH) return script(CARD_BRIDGE_SOURCE)
  if (relativePath === 'card.html') return cardPage(origin, packageDir)
  if (relativePath === TOKENS_PATH) return stylesheet(DESIGN_TOKENS_CSS)

  const file = resolve(packageDir, relativePath)
  if (!file.startsWith(packageDir + sep)) return notFound()

  try {
    const data = await readFile(file)
    return new Response(data, {
      headers: {
        'content-type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
        'access-control-allow-origin': '*',
      },
    })
  } catch {
    return notFound()
  }
}

async function wrapperPage(origin: string, packageDir: string): Promise<Response> {
  const hasStyles = await exists(join(packageDir, 'ui', 'styles.css'))

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${TOKENS_PATH}" />
    ${hasStyles ? '<link rel="stylesheet" href="ui/styles.css" />' : ''}
  </head>
  <body>
    <script src="${BRIDGE_PATH}"></script>
    <script type="module" src="ui/index.js"></script>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html',
      'content-security-policy': `default-src 'none'; script-src ${origin}; style-src ${origin} 'unsafe-inline'`,
    },
  })
}

async function cardPage(origin: string, packageDir: string): Promise<Response> {
  if (!(await exists(join(packageDir, 'ui', 'card.js')))) return notFound()

  const hasStyles = await exists(join(packageDir, 'ui', 'card.css'))

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${TOKENS_PATH}" />
    ${hasStyles ? '<link rel="stylesheet" href="ui/card.css" />' : ''}
  </head>
  <body>
    <script src="${CARD_BRIDGE_PATH}"></script>
    <script type="module" src="ui/card.js"></script>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html',
      'content-security-policy': `default-src 'none'; script-src ${origin}; style-src ${origin} 'unsafe-inline'`,
    },
  })
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function stylesheet(source: string): Response {
  return new Response(source, {
    headers: { 'content-type': 'text/css', 'access-control-allow-origin': '*' },
  })
}

function script(source: string): Response {
  return new Response(source, {
    headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' },
  })
}

function notFound(): Response {
  return new Response('Not found', { status: 404 })
}
