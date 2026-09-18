# @dudong2/pi-context

A hardened, independent fork of `@spences10/pi-context@0.1.16` for Pi.
It stores oversized text tool results in a scoped SQLite/FTS5 sidecar and
returns a bounded receipt instead of flooding model context.

The fork retains the upstream SQLite schema, lossless chunking, FTS5 search,
focused retrieval, file export, and project/session scoping. It owns the
capture, redaction, persistence, and output-limit boundaries and has no runtime
dependency on the upstream monorepo packages.

## Safety guarantees

- Ordinary payload text such as `[context-sidecar]` never suppresses capture.
  A pre-existing receipt is skipped only when structured result details identify
  a source that exists in the active scope.
- Redaction and indexing run in a worker thread. Pi's current `AbortSignal` is
  forwarded to the worker, and session shutdown terminates outstanding workers.
- Persistence failures fail closed: oversized original output is withheld and a
  small error receipt is returned.
- Redaction is linear-time for long token-like input; no unredacted output or
  tool-input summary is written to SQLite.
- Mixed text/image results retain all non-text items and their relative order.
- `context_get` requires `chunk_id`. Full-source retrieval is file-only through
  `context_export`.
- Every chat-returning tool path is capped at 50 KiB and 2,000 lines.
- Scope filtering remains active when `source_id` is supplied unless
  `global: true` is explicit.
- Storage limits are enforced after each successful write, registry-owned DB
  handles are closed on replacement/shutdown, and search/get bytes are included
  in returned-byte statistics.

See the [hardening design](./docs/hardening-design.md) for boundary details.

## Requirements

- Node.js `>=24.15.0` (`node:sqlite` with FTS5)
- Pi extension host `@earendil-works/pi-coding-agent`

## Install for local development

```bash
npm install
npm run build
pi install .
```

The package entry point is `dist/index.js` and is declared in `package.json` as a
Pi extension. Tagged Git releases include prebuilt `dist/` artifacts because
Pi installs Git packages with production dependencies only.

## Tools

- `context_search` — scoped FTS5 search; concise snippets by default.
- `context_get` — bounded chunk retrieval; `source_id` and `chunk_id` required.
- `context_export` — full or ranged file export without returning file content
  to chat.
- `context_list` — scoped source metadata.
- `context_stats` — scoped/global storage and returned-byte accounting.
- `context_purge` — validated cleanup by age or source.

`context_get` supports exact chunk ids and ordinal aliases such as `1` or
`0001`. `before` and `after` are integers from 0 through 3.

## Commands

- `/context list [limit]`
- `/context stats`
- `/context settings [default|light|balanced|research|archive]`
- `/context purge [days|expired|source <source-id>]`
- `/context-stats`

The command surface is intentionally text-only; the upstream modal UI and eval
harness were removed from the runtime package.

## Storage and configuration

The default database path is:

```text
${PI_CODING_AGENT_DIR:-~/.pi/agent}/context.db
```

Environment overrides:

- `MY_PI_CONTEXT_DB`
- `MY_PI_CONTEXT_RETENTION_DAYS`
- `MY_PI_CONTEXT_PURGE_ON_SHUTDOWN`
- `MY_PI_CONTEXT_MAX_MB`
- `MY_PI_CONTEXT_CAPTURE_MAX_KB`
- `MY_PI_CONTEXT_CAPTURE_MAX_LINES`
- `MY_PI_CONTEXT_MCP_MAX_KB`
- `MY_PI_CONTEXT_MCP_MAX_LINES`
- `MY_PI_CONTEXT_CONFIG`

Saved settings default to `~/.config/my-pi/context.json`.

## Development

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:coverage
```

The redaction performance regression uses a worker timeout so a pathological
implementation cannot freeze the test runner.

## Provenance

Forked from `@spences10/pi-context@0.1.16` under the MIT license. The original
changelog is retained in [`CHANGELOG.md`](CHANGELOG.md); fork-specific design
and safety changes are documented in this repository.
