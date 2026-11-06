# Spec: Package generation flow

Status: draft, pending review
Related: `package-contract.md` (not yet written), `architecture.md` (not yet written)

## Purpose

A user describes a tool in the chat (for example "a todo list with due dates"). The app generates a package with the Claude Agent SDK, shows the user what it will install, and installs it only after approval. The generated package is then loaded dynamically as a tool.

## Decisions this spec relies on

- Generation uses the Claude Agent SDK, not a raw Messages API call.
- The user supplies their own Anthropic API key. It is stored in the OS keychain through Electron `safeStorage`, never in plain text on disk.
- The agent writes only into a per-request staging folder. It has no shell access.
- The host, not the agent, validates and installs packages.
- Generated UI code is untrusted at runtime, whatever produced it. Runtime sandboxing is specified separately.

## Actors

- **User:** describes tools in the chat and approves or rejects generated packages.
- **Chat UI:** collects the request and shows progress and the review screen.
- **Generation service:** runs the Agent SDK session and manages the staging folder.
- **Package validator:** checks the staged output against the package contract.
- **Package registry:** installs approved packages into the user packages folder and makes them available to the tool bar.

## Staging layout

```
<app-data>/staging/<request-id>/
  spec.md        # the spec the agent works from, written by the host
  package/       # the only directory the agent may write to
```

After approval, `package/` is copied to `<app-data>/packages/<package-id>/`. The staging folder is deleted after install or rejection.

## Scenarios

### API key setup

**S1. First use without a key**
- Given no API key is stored
- When the user sends a generation request
- Then the chat asks for an API key and does not start a generation

**S2. Saving a key**
- Given the user enters an API key in settings
- When the key is saved
- Then it is stored encrypted with `safeStorage`
- And the settings screen shows only a masked value afterwards

**S3. Invalid key**
- Given a stored key that the API rejects
- When a generation starts
- Then the request fails before any files are written
- And the user sees an "API key rejected" message with a link to settings

### Generation

**S4. Happy path**
- Given a valid key
- When the user submits a request
- Then the host creates `staging/<request-id>/` and writes `spec.md`
- And the agent runs with its working directory set to `package/`
- And progress messages appear in the chat

**S5. Write restriction**
- Given a running generation session
- When the agent tries to write outside `package/`
- Then the `canUseTool` hook denies the call
- And the denial is recorded in the request log

**S6. No shell access**
- Given a running generation session
- When the agent requests a shell command
- Then the call is denied
- And the session continues with file tools only

**S7. Generation timeout**
- Given a generation running longer than 5 minutes
- When the timeout is reached
- Then the session is stopped and the staging folder is kept for inspection
- And the user can retry or discard the request

**S8. Cancellation**
- Given a running generation
- When the user cancels
- Then the session stops and the staging folder is deleted

### Validation

**S9. Valid output**
- Given the agent has finished
- When the validator runs on `package/`
- Then it checks that `manifest.json` matches the package schema, that the UI entry file exists, and that the bundle builds
- And the request moves to review

**S10. Invalid output**
- Given the validator reports errors
- When the errors are returned to the user
- Then the user can ask for a fix, which starts a new session on the same staging folder with the errors added to the spec
- And at most 3 fix attempts are allowed per request

**S11. Validator rejects permissions**
- Given a manifest requests a permission that is not in the allowed list
- When validation runs
- Then the package is rejected with the offending permission named

### Review and install

**S12. Review screen**
- Given validation passed
- When the review screen opens
- Then it shows the spec, the manifest, the list of files, and the requested permissions
- And nothing is installed yet

**S13. Approve**
- Given the user approves
- When install runs
- Then `package/` is copied to `<app-data>/packages/<package-id>/`
- And the package appears in the tool bar without restarting the app
- And the staging folder is deleted

**S14. Reject**
- Given the user rejects
- When the rejection is confirmed
- Then the staging folder is deleted
- And nothing is installed

**S15. Package id collision**
- Given a package with the same id already exists
- When install runs
- Then the user is asked whether to replace it or install under a new id
- And replacing keeps the package's existing data store

### Recovery

**S16. App closed during generation**
- Given the app quits while a generation is running
- When the app starts again
- Then staging folders without an approved install are listed in the chat as unfinished
- And the user can resume, review, or discard each one

## Non-goals (this version)

- Editing an installed package through the chat. That is a separate spec.
- Sharing or downloading packages from other users.
- Running generation with a subscription login instead of an API key.
- Generation in the cloud or on a server.

## Open questions

1. Model choice for generation: default to the latest Sonnet, or let the user pick? Proposed: default Sonnet, with a setting to change it.
2. Attempt limit of 3 for fixes (S10): reasonable, or should it be configurable?
3. Verify the current Anthropic terms for embedding the Agent SDK in a distributed app with user-supplied keys before release.
