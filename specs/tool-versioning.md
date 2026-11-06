# Spec: Tool versioning and data migration

Status: draft, pending review
Related: `package-contract.md`, `generation-flow.md`

## Purpose

A tool can be edited again and again, and its saved data outlives any single version of its code. This spec defines how the host keeps old data readable after a change, and how it recovers when a change goes wrong.

## Two versions

- `manifest.version`: the code version, semver, bumped on every change. Shown to the user.
- `schema.json` `schemaVersion`: an integer, starting at 1, describing the shape of the stored records. Bumped only when the shape changes.

A change that only touches the UI does not bump `schemaVersion`.

## The database remembers its schema version

Each tool's database has a `_meta` table with one row: `schema_version`. The host sets it when it creates the database and after each successful migration. It is not written by the tool.

## Compatibility rules

A generated change must keep old records readable without a migration when possible.

- Adding a field: allowed without a bump. The field must have a `default`, and the tool must treat a missing field as that default.
- Removing, renaming or changing the type of a field: requires a bump of `schemaVersion` and a migration.
- Changing the meaning of a field: treat as a rename.

The generator is told these rules, and the review checks that new fields have defaults.

## Migrations

When `schemaVersion` goes up, the generator also writes `migrations/<from>-to-<to>.js`, one file per step, exporting one pure function over an array of records. The host runs it as follows:

1. Snapshot the database (see below).
2. Copy the database to a temporary file and run the migration on the copy.
3. Check that every migrated record matches the new `schema.json`.
4. Replace the live database only if steps 2 and 3 succeed. Set `_meta.schema_version`.

If any step fails, the live database is untouched and the install is refused with the error shown in the review.

Migrations run without filesystem, network or database access. How the host sandboxes this is an open question (see below).

## Snapshots

Before any install, replace, or migration, the host copies the tool's database to `backups/<package-id>/<timestamp>.db` and keeps the last 5. A snapshot is cheap and is the way back when a change goes wrong.

## Installing over an existing tool

- A new tool whose id already exists replaces the code. The data is kept, so the tool must be able to read it.
- If the new tool's `schemaVersion` is higher than the database's, run the migration steps in order.
- If it is lower, refuse the install. A downgrade would make the data unreadable to the older code.

## Open questions

1. **Sandboxing migrations.** Migrations run in the main process only if they can be made to have no access to anything else. Options: run them in a worker thread with no `require`, or in a `vm` context. Recommended: a worker with a strict allowlist.
2. **Same-id tools.** Two different tools can end up with the same id, as happened with the Task Board and the Whiteboard, which shared one database. Should a replace that changes the tool's purpose ask whether to keep or clear its data? Recommended: yes, using the same dialog as uninstall.
3. **Retention.** Keep 5 snapshots per tool, or make it a setting?
