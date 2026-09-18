# Hardening design

## Trust boundaries

Tool text, custom tool names, and tool inputs are untrusted. Project/session
scope comes from Pi's extension context and is used as an authorization filter
for default retrieval. `global: true` is the only scope bypass.

The model-context boundary is fail-closed. Once a result crosses the capture
threshold, the original text is never returned by the lifecycle hook unless it
has first been safely redacted and persisted. Failure returns a bounded error
receipt with no payload preview.

## Capture and receipt identity

`tool_result` capture ignores only `context_*` tools to prevent recursion.
Payload strings are not receipt signals. A result may bypass capture as an
existing receipt only when all of these hold:

1. `details.contextSidecar` has the supported version and receipt kind.
2. The result contains exactly one text item with the matching source id.
3. The source exists in the active project/session scope.

Successful capture replaces text items in place. The first gets the receipt and
additional text items get small source references. Non-text items are copied
unchanged, preserving their relative order.

## Worker persistence and cancellation

`src/persistence.ts` creates a worker for redaction, chunking, hashing, SQLite
transactions, and immediate size enforcement. This keeps regex and database work
off Pi's UI event loop. It forwards `ExtensionContext.signal`, terminates the
worker on abort, and terminates outstanding workers during session shutdown.
Worker errors cross the boundary only as an error class name; tool payloads and
exception messages are not logged.

Tests import the built worker while exercising TypeScript sources. Therefore
`npm test` builds before Vitest.

## Redaction

`src/redaction.ts` uses fixed-prefix token patterns, bounded field assignment
matching, and a one-pass dotted-token scanner. The scanner advances monotonically
and avoids the repeated suffix retries caused by the upstream Kagi pattern.

Both content and persisted tool-controlled metadata (`tool_name` and
`input_summary`) are redacted inside `ContextStore.store`, so direct API callers
cannot bypass metadata redaction. Lifecycle input summaries are also redacted
before crossing the worker boundary.

## Retrieval limits and accounting

`context_get` requires a chunk id and allows at most three neighboring chunks on
each side. Full-source access is available only through `context_export`, which
returns metadata and writes content to a file.

`limit_chat_output` is the final guard on every tool response. It caps UTF-8
output at 50 KiB and 2,000 lines, including the truncation notice.
`context_search` and `context_get` record the exact final UTF-8 byte count against
the involved source rows.

## Storage lifecycle

Every successful store or dedupe write applies the active `max_mb` policy. If a
new source cannot fit and is immediately evicted, the caller receives a
fail-closed eviction receipt rather than a dangling retrieval receipt.

The global registry closes its current `DatabaseSync` before switching paths and
when the sidecar is disabled. Destructive age and size filters are validated as
non-negative safe integers at runtime.

## Deliberate limits

- `returned_byte_count` measures sidecar search/get responses, including their
  formatting. It does not attempt to account for model-provider framing tokens.
- Storage quota is based on stored source bytes, matching the retained schema;
  SQLite page/WAL overhead is reported separately in stats.
- Full exports are trusted local file operations and are intentionally not added
  to chat returned-byte totals.
