import { query, type CanUseTool } from '@anthropic-ai/claude-agent-sdk'
import { join, resolve, sep } from 'node:path'

import type { KeyStore } from '../../application/ports/key-store'
import type { PackageGenerator } from '../../application/ports/package-generator'

const MODEL = 'claude-sonnet-5-5'
const ALLOWED_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep']
const DISALLOWED_TOOLS = ['Bash', 'WebFetch', 'WebSearch', 'Task']

const SYSTEM_PROMPT = `You generate small, self-contained tool packages for the Workplace desktop app.

Work only with the Read, Write, Edit, Glob and Grep tools inside your working directory. Create these files:
- manifest.json: { "id", "name", "version", "icon", "description", "entry", "permissions", "contractVersion" }
  - id: the package id given in the instructions, exactly
  - name: 1 to 40 characters
  - version: "1.0.0"
  - icon: a lucide icon name such as "check-square"
  - description: optional, at most 200 characters
  - entry: "ui/index.js"
  - permissions: [] unless the tool stores data, then ["store"]
  - contractVersion: 1
- ui/index.js: an ES module that renders the tool into document.body with plain DOM APIs.
  - Do not import anything.
  - Do not use fetch, XMLHttpRequest, WebSocket, localStorage or any other network or storage API. The tool runs in a sandboxed iframe, so keep its state in memory.
  - Keep the interface simple and accessible.
- ui/styles.css (optional)
- schema.json (only when the tool keeps data): { "collections": { "<name>": { "fields": { "<field>": { "type": "string" | "number" | "boolean" | "date", "required": true, "default": ... } } } } }

Persistence:
- If the tool must keep data across restarts, put "store" in permissions and declare its collections in schema.json.
- Use window.host.store, which is available before ui/index.js runs. All calls are async:
  - await window.host.store.list(collection) returns every record in the collection
  - await window.host.store.get(collection, id) returns one record or null
  - await window.host.store.insert(collection, data) returns the new record
  - await window.host.store.update(collection, id, data) returns the updated record
  - await window.host.store.remove(collection, id) returns true when a record was deleted
- Records have id, createdAt and updatedAt set by the host. Only fields declared in the schema are accepted.
- Never use localStorage, sessionStorage or IndexedDB. They do not work in this sandbox.

Do not create files outside the working directory. When you are finished, reply with one short sentence.`

export class AgentSdkPackageGenerator implements PackageGenerator {
  constructor(
    private readonly stagingRoot: string,
    private readonly keys: KeyStore,
  ) {}

  async generate(requestId: string, instructions: string): Promise<void> {
    const apiKey = await this.keys.read()
    if (!apiKey) throw new Error('Add your Anthropic API key in settings first')

    const packageDir = resolve(join(this.stagingRoot, requestId, 'package'))

    const session = query({
      prompt: instructions,
      options: {
        cwd: packageDir,
        model: MODEL,
        systemPrompt: SYSTEM_PROMPT,
        // Bare names in allowedTools skip canUseTool, so the file tools are left out here and checked there.
        disallowedTools: DISALLOWED_TOOLS,
        canUseTool: confineTo(packageDir),
        settingSources: [],
        maxTurns: 30,
        env: { ...process.env, ANTHROPIC_API_KEY: apiKey },
      },
    })

    for await (const message of session) {
      if (message.type === 'result' && message.subtype !== 'success') {
        throw new Error('Package generation did not finish')
      }
    }
  }
}

function confineTo(packageDir: string): CanUseTool {
  return async (toolName, input) => {
    if (!ALLOWED_TOOLS.includes(toolName)) {
      return { behavior: 'deny', message: `${toolName} is not available` }
    }

    const target = typeof input.file_path === 'string' ? input.file_path : input.path
    if (typeof target === 'string' && !isInside(packageDir, resolve(packageDir, target))) {
      return { behavior: 'deny', message: 'Paths must stay inside the package folder' }
    }

    return { behavior: 'allow', updatedInput: input }
  }
}

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(root + sep)
}
