# Spec: Architecture

Status: draft, pending review
Related: `generation-flow.md`, `package-contract.md`

## Purpose

Define the layers of the Electron app, the dependency rules between them, and where each feature lives. The goal is that domain rules do not depend on Electron, the SDK, or React, so they can be tested without a running app.

## Stack (proposed)

- Electron with TypeScript in both main and renderer
- React for the shell (tool bar, chat, settings, review screen)
- electron-vite as the build tool
- SQLite for package data stores
- Claude Agent SDK for package generation
- Vitest for unit tests, Playwright for end-to-end tests against the packaged app

## Layers

Dependencies point inward only. An outer layer may import an inner layer, never the reverse.

```
presentation  →  application  →  domain
infrastructure →  application  →  domain
```

| Layer | Contains | May import | Must not import |
|---|---|---|---|
| `domain` | Package, Manifest, Permission, Collection, Request, rules and validation | nothing outside domain | Electron, React, SDK, fs, sqlite |
| `application` | Use cases and the ports (interfaces) they need | domain | any framework or infrastructure |
| `infrastructure` | Adapters: filesystem, SQLite, keychain, Agent SDK, IPC, custom protocol | application, domain, framework SDKs | presentation |
| `presentation` | React components, IPC handlers wired to use cases, iframe bridge | application, domain | infrastructure directly |

Composition happens in one place per process, the main-process entry and the renderer entry. Those are the only files that know about concrete adapters.

## Use cases

Each use case is one function or class with one public method, takes its ports as constructor arguments, and returns a result type.

| Use case | Source spec |
|---|---|
| `SaveApiKey`, `GetApiKeyStatus` | generation-flow S1 to S3 |
| `StartGeneration`, `CancelGeneration`, `RetryFix` | generation-flow S4 to S8, S10 |
| `ValidateStagedPackage` | generation-flow S9 to S11, package-contract validation |
| `ApproveRequest`, `RejectRequest` | generation-flow S12 to S15 |
| `ListUnfinishedRequests`, `ResumeRequest`, `DiscardRequest` | generation-flow S16 |
| `ScanPackages` | package-contract loading, C2 |
| `OpenPackage` | package-contract C1 |
| `ReadRecords`, `WriteRecords` | package-contract C3, C4, C8 |
| `EmitEvent`, `SubscribeEvent` | package-contract C5, C6 |
| `UninstallPackage` | package-contract C9 |

## Ports

Ports are interfaces the application layer owns. Infrastructure implements them.

| Port | Implemented by |
|---|---|
| `KeyStore` | keychain adapter (`safeStorage`) |
| `PackageGenerator` | Agent SDK adapter |
| `PackageRepository` | filesystem adapter over `packages/` and `staging/` |
| `DataStore` | SQLite adapter, one file per package |
| `Clock`, `IdGenerator` | system adapters, replaced in tests |
| `EventBus` | in-process adapter in main |
| `Notifier` | Electron notification adapter |

## Process boundaries

- **Main process:** owns the use cases, the ports' adapters for fs, SQLite, keychain, and the Agent SDK. It is the only process that touches disk or the network.
- **Renderer (shell):** React UI. Talks to main only through a typed IPC contract generated from the application layer's input and output types.
- **Package iframes:** sandboxed, see package-contract. They reach the host only through the `postMessage` bridge, which forwards to the same use cases the shell uses.

## Folder layout (proposed)

```
src/
  domain/
    package/
    permissions/
    requests/
  application/
    generation/
    packages/
    keys/
    ports/
  infrastructure/
    fs/
    sqlite/
    keychain/
    agent-sdk/
    ipc/
    protocol/
  presentation/
    shell/        # tool bar, chat, settings, review screen
    bridge/       # package iframe bridge
  main.ts         # composition root, main process
  renderer.tsx    # composition root, renderer
packages/         # built-in packages (see package-contract)
specs/
tests/
```

## Testing strategy

- **Domain and application:** unit tests with in-memory fakes for every port. These cover all the Given/When/Then scenarios in the specs.
- **Infrastructure:** integration tests for the SQLite adapter, the filesystem adapter, and the protocol handler (including path traversal, C7).
- **Generation:** the Agent SDK adapter is tested against a fake SDK client. One opt-in test runs against a real key and is not part of CI.
- **End-to-end:** Playwright drives the packaged app for the main flows: set key, generate, approve, open tool, store data.
- Each scenario ID in the specs maps to at least one test. The test name includes the ID, for example `S5 denies writes outside package dir`.

## Decisions

1. **Ports owned by application, not infrastructure.** Keeps the dependency rule enforceable.
2. **One SQLite file per package** rather than one shared database. Makes isolation and uninstall simple.
3. **IPC contract generated from use case types.** Avoids the shell and main drifting apart.
4. **No framework code in domain.** Validation rules in domain are plain functions over plain objects.

## Open questions

1. Should the chat and the tool bar be separate renderer windows, or one window with panels? Proposed: one window.
2. Should the Agent SDK run in the main process or in a utility process? Proposed: a utility process, so a stuck generation can't freeze the UI. Confirm this is worth the extra IPC.
3. Do we enforce the dependency rules with a lint rule (for example eslint-plugin-boundaries) or rely on review? Proposed: lint rule from the start.
