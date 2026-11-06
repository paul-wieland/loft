# Spec: Package contract

Status: draft, pending review
Related: `generation-flow.md`, `architecture.md`

## Purpose

A package is a self-contained tool: its UI, its manifest, and optionally its own data store. This spec defines what a package must contain, what it may access, and how the host loads it. Generated packages and built-in packages follow the same contract.

## Package layout

```
<package-id>/
  manifest.json      # required
  ui/
    index.js         # required, ES module, the UI entry point
    styles.css       # optional
  schema.json        # optional, present when the package stores data
  specs/             # optional, the spec the package was generated from
```

`<package-id>` is lowercase kebab-case, 3 to 40 characters, matching `^[a-z][a-z0-9-]{2,39}$`.

## Manifest

```json
{
  "id": "todo-list",
  "name": "Todo list",
  "version": "1.0.0",
  "icon": "check-square",
  "description": "Tasks with due dates.",
  "entry": "ui/index.js",
  "permissions": ["store"],
  "contractVersion": 1
}
```

| Field | Required | Rules |
|---|---|---|
| `id` | yes | Must match the folder name and the id pattern above |
| `name` | yes | 1 to 40 characters |
| `version` | yes | Semantic version |
| `icon` | yes | Name from the bundled icon set |
| `description` | no | Up to 200 characters |
| `entry` | yes | Relative path inside the package, must exist |
| `permissions` | yes | Array, may be empty, values only from the allowed list below |
| `contractVersion` | yes | Integer, currently `1` |

## Allowed permissions

| Permission | Grants |
|---|---|
| `store` | Read and write this package's own data store |
| `notify` | Show a host notification |
| `clipboard.write` | Copy text to the clipboard |

Any other value is rejected by the validator. A package has no network access, no filesystem access, and no access to other packages, regardless of permissions. Network access would need its own spec.

## Data store

A package with `store` permission gets one store that only it can access.

- Schema is declared in `schema.json` as a list of collections with typed fields.
- The host creates and migrates the store. The package never gets a file path.
- Stores are kept under `<app-data>/data/<package-id>.db`.
- Uninstalling a package asks whether to keep or delete its data.

```json
{
  "collections": {
    "tasks": {
      "fields": {
        "title": { "type": "string", "required": true },
        "dueDate": { "type": "date" },
        "done": { "type": "boolean", "default": false }
      }
    }
  }
}
```

Allowed field types: `string`, `number`, `boolean`, `date`. Every record gets `id`, `createdAt`, and `updatedAt` from the host.

## Host API

The UI receives a single `host` object. Calls go through IPC to the main process and are checked against the manifest's permissions.

```ts
interface PackageHost {
  store: {
    list(collection: string, query?: Query): Promise<Record[]>
    get(collection: string, id: string): Promise<Record | null>
    insert(collection: string, data: object): Promise<Record>
    update(collection: string, id: string, data: object): Promise<Record>
    remove(collection: string, id: string): Promise<void>
  }
  notify(message: string): void
  clipboard: { write(text: string): void }
  events: {
    emit(name: string, payload?: unknown): void
    on(name: string, handler: (payload: unknown) => void): () => void
  }
}
```

Calls to a permission the package did not declare throw `PermissionDenied`.

## Events between packages

Packages never import each other. They communicate only through `events`, and the host delivers each event to subscribers across packages. Event names are namespaced as `<package-id>.<event>`. A package may only emit events under its own namespace. Subscribing to another package's events is allowed.

## Loading and sandboxing

- Each package's UI runs in its own sandboxed iframe with `sandbox="allow-scripts"`, no `allow-same-origin`, and no Node integration.
- The host serves package files through a custom protocol, `workplace-pkg://<package-id>/<path>`, which only resolves files inside that package's folder.
- The iframe loads `ui/index.js` as an ES module and gets `host` through a `postMessage` bridge. The bridge checks each message against the manifest.
- Content-Security-Policy in the iframe allows scripts only from `workplace-pkg://<package-id>/`.
- Packages are discovered at startup and when a new package is installed. They are not loaded until opened.

## Built-in packages

Built-in packages live in the repo under `packages/` and follow this contract exactly. They are copied into the build output. The host treats them the same as user packages, except they cannot be uninstalled.

## Validation rules

The validator runs before install and at every startup scan. It rejects a package if:

1. `manifest.json` is missing or is not valid JSON.
2. Any required manifest field is missing, or a value breaks its rule.
3. `id` does not match the folder name.
4. `entry` does not exist.
5. `permissions` contains a value outside the allowed list.
6. `schema.json` is present but invalid, or declares a field type outside the allowed list.
7. `contractVersion` is higher than the host supports.
8. The package contains symlinks that point outside its folder.

## Scenarios

**C1. Valid package loads**
- Given a package that passes validation
- When the user opens it from the tool bar
- Then its iframe loads and renders

**C2. Folder and id mismatch**
- Given a package folder `todo` whose manifest says `id: "tasks"`
- When the startup scan runs
- Then the package is skipped and the scan log records the mismatch

**C3. Undeclared permission**
- Given a package without `store` in its permissions
- When its UI calls `host.store.list`
- Then the call throws `PermissionDenied`
- And the package UI keeps working for everything else

**C4. Data isolation**
- Given two packages each with a store
- When package A reads its own collection
- Then it gets only its own records
- And it has no way to name package B's store

**C5. Events across packages**
- Given package A emits `a.task-done`
- When package B subscribes to `a.task-done`
- Then package B's handler receives the payload
- And package A cannot emit `b.something`

**C6. Emitting outside namespace**
- Given package A
- When it emits an event named `b.something`
- Then the host rejects the event and logs it

**C7. Path traversal**
- Given a request for `workplace-pkg://todo/../other/ui/index.js`
- When the protocol handler resolves it
- Then the request is refused

**C8. Schema migration**
- Given a package at contract version 1 with a store
- When its schema gains a new optional field in a later version
- Then the host migrates the store on load without losing records

**C9. Uninstall keeps data by choice**
- Given an installed package with data
- When the user uninstalls and chooses to keep data
- Then the package folder is removed
- And `<app-data>/data/<package-id>.db` is kept

## Open questions

1. Should `clipboard.write` stay in v1, or is it not needed yet?
2. Should a package be able to open a host-level dialog such as a file picker? Proposed: not in v1.
3. Is `store` enough for querying, or do packages need sorting and filtering beyond the simple `Query` shape? Proposed: a minimal `where` and `orderBy` for v1.
