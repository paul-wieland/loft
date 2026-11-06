# Spec: Data chat per tool

Status: draft, pending review
Related: `package-contract.md`, `tool-versioning.md`, `home-cards.md`

## Purpose

Each tool gets a chat where the user can ask about the tool's data ("what is due this week?") and make changes in plain language ("move the Jira tickets to done"). The chat works on that tool's data only. It does not change the tool's code. Changing the code stays with Edit.

## Entry point

A "Chat" button in the tool's header, next to Edit. It opens the chat in the bottom panel, the same place as the edit chat, with its own banner so the two are never confused.

## What the model can do

The model gets a small set of tools, each scoped to the open tool's store. It has no file, network or other tool access.

- `list_collections`: the collections and fields from the tool's `schema.json`.
- `list_records(collection, limit)`: at most 200 records per call, newest first.
- `get_record(collection, id)`.
- `propose_changes(changes)`: insert, update or remove records. Nothing is written by this call; it returns a preview for the user.

Reads run immediately. Writes only happen when the user applies a proposal.

## Writes

- A proposal is shown in the chat as a list of changes (added, changed, removed), with Apply and Discard.
- Apply writes the changes through the host. Before applying, the database is snapshotted with the existing backup mechanism.
- A proposal that touches more than 20 records needs a second confirmation.
- Discard writes nothing.

## Data and privacy

- Records read by the model are sent to the Anthropic API as part of the conversation, using the same API key as generation. The chat shows a one-line note saying so the first time it opens for a tool.
- No record is sent unless the model asks for it through a tool call.

## Model and cost

- Default model: the same as generation (`claude-sonnet-5-5`).
- Each reply is limited in length. Large reads are summarised by the model rather than pasted in full.

## Conversation history

- History lives in memory, one thread per tool. It is cleared when the app restarts.

## Failure

- If the API key is missing or a call fails, the chat shows the error and nothing is changed.
- A proposal that fails part-way is rolled back using the snapshot taken before Apply.

## Open questions

1. **Writes now or later?** Recommended: read and propose-with-Apply from the start. Writes that apply without Apply are not allowed.
2. **Keep history across restarts?** Recommended: no, in memory only.
3. **Model.** Sonnet for quality, or a smaller model for cheaper, faster replies? Recommended: Sonnet, the same as generation.
4. **Record data going to Anthropic.** Acceptable with the one-line note, or should the user opt in per tool?
