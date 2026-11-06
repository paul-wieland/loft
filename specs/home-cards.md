# Spec: Home cards

Status: draft, pending review
Related: `package-contract.md`, `tool-versioning.md`

## Purpose

A tool can offer a small card that the home screen shows, such as the tasks due today, or a shortcut to the last board opened. Tools without a card show nothing on home.

## Contract

A package opts in by declaring a card in `manifest.json`:

```json
"homeCard": { "size": "small" }
```

- `size`: `"small"` (one column) or `"wide"` (two columns). Initial set: these two only.
- The card's UI is `ui/card.js`, the same kind of ES module as `ui/index.js`, with its own optional `ui/card.css`.
- The card runs in its own sandboxed frame, like the tool does, with the same bridge.

A package without `homeCard` has no card. Adding a card later is a code change and follows the normal versioning rules.

## Behaviour

- **Read-only.** A card may call `window.host.store.list` and `get` only. Insert, update and remove are refused in card frames. The host enforces this, not the card.
- **Permissions.** A card that reads data needs `store` in `permissions`, like the tool. A card cannot ask for more than the tool has.
- **Opening the tool.** Clicking the card asks the host to open the tool, through a `workplace:open` message. A card cannot open another tool.
- **Refresh.** The card is loaded when home is shown. Each card is reloaded when its tool's data changes, so it does not show stale numbers.
- **Failure.** If a card fails to load or throws, the home screen shows a small placeholder with the tool's name. The rest of home still works.
- **Order.** Cards follow the sidebar order of their tools.

## Creating and editing

- The New tool form gets a "Show a card on the home page" option. When it is on, the generator also writes `ui/card.js` and the `homeCard` entry.
- When editing, the same option applies, and the review shows the card alongside the tool.
- The generator is told that a card is read-only, and to keep it small.

## Open questions

1. **Frame per card or host-rendered?** Each card in its own frame keeps tools isolated and needs no new host code per tool. Recommended: frame per card. Cost: one extra frame per card; fine for a handful, slower with many.
2. **Refresh trigger.** Reload on data change, as above, or on a timer too? Recommended: on data change only, plus when home is shown.
3. **Default for new tools.** Should the card option start on or off? Recommended: off, so the home screen is not crowded by surprise.
4. **Existing tools.** The Whiteboard and Tasks have no card. Add one by editing them, or leave them without?
