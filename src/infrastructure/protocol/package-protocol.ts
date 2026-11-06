import { protocol } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

import { isValidPackageId } from '../../domain/package/package-id'
import { HOST_BRIDGE_SOURCE } from './host-bridge'

const BRIDGE_PATH = '__workplace/bridge.js'

export const PACKAGE_SCHEME = 'workplace-pkg'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
}

export function registerPackageScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PACKAGE_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ])
}

export function servePackages(packagesRoot: string): void {
  protocol.handle(PACKAGE_SCHEME, async (request) => {
    const url = new URL(request.url)
    const packageId = url.hostname
    if (!isValidPackageId(packageId)) return notFound()

    const packageDir = join(packagesRoot, packageId)
    const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1))

    if (relativePath === 'index.html') return wrapperPage(packageId, packageDir)
    if (relativePath === BRIDGE_PATH) return script(HOST_BRIDGE_SOURCE)

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
  })
}

async function wrapperPage(packageId: string, packageDir: string): Promise<Response> {
  const origin = `${PACKAGE_SCHEME}://${packageId}`
  const hasStyles = await exists(join(packageDir, 'ui', 'styles.css'))

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function script(source: string): Response {
  return new Response(source, {
    headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' },
  })
}

function notFound(): Response {
  return new Response('Not found', { status: 404 })
}
