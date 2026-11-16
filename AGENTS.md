# pi-context Repository Instructions

## Upstream update and deployment flow

This repository follows upstream with the smallest necessary local patch set. An authorized upstream update is an end-to-end operation, not just edits on the currently checked-out patch branch. Unless the user explicitly limits the scope, complete this sequence:

1. Inspect the worktree, remote branches, exact upstream release tag, package metadata, and current Pi installation. Preserve unrelated files, local configuration, existing branches, tags, and user data.
2. Update `main` to the target upstream release's `packages/pi-context` baseline. Keep only standalone repository/build/test wiring, prebuilt Git-install artifacts, and repository instructions on `main`; do not carry our runtime patches or patch-specific regression tests onto it. Commit the baseline separately and identify the upstream tag and source commit in the commit message.
3. Create `dudong2/v<upstream-version>` directly from the updated `main` (for example, `dudong2/v0.3.2`). Do not continue an upgrade on an older version's patch branch or leave `main` behind.
4. Reassess each existing local patch against the new upstream. Reproduce remaining defects with isolated data, drop patches superseded by upstream, and apply only the necessary patches and their regression tests on the new versioned branch. Do not merge the patched branch back into `main`.
5. Build and test the baseline and patched branch. On the patched branch run regression tests, typecheck, lint, relevant performance checks, `git diff --check`, and package/artifact checks. Rebuild tracked `dist/` before committing. Verify the runtime source delta from upstream remains minimal.
6. Commit our patches separately. Push `main` and the new versioned branch with ordinary non-force pushes. Preserve the old patch branch and tags. If remote history conflicts, stop and report it rather than rewriting shared history.
7. Change the existing Pi package installation to `git:github.com/dudong2/pi-context@dudong2/v<upstream-version>` using the supported Pi package CLI. Preserve unrelated package declarations and filters; do not edit managed package source or `node_modules` directly, and do not update unrelated packages or Pi itself.
8. Verify local and remote branch ancestry, installed commit/version/source, installed `dist/` equality, and extension loading/acceptance behavior through the real current Pi loader with a temporary database and isolated agent directory. Distinguish installed files and a fresh-process probe from the already-running session; state when a Pi restart is needed.
9. Report baseline and patch commit IDs, pushed branches, installed source, and actual verification results. Do not report an update as complete while only the worktree has changed. If a step is blocked, state the exact blocker and unfinished steps.

A read-only request to check upstream is not permission to modify, commit, push, or install. An authorized request to perform the upstream update uses the full flow above unless the user says otherwise. Never force-push, rewrite existing history, delete user data, persist secrets, or change unrelated shared state as part of this flow.

## Working conventions

- Reply and write user-reviewed prose in Korean; keep agent-only configuration and skill files in English.
- Prefer upstream code and existing dependencies; avoid independent replacement implementations when a narrow patch suffices.
- Test with temporary databases and synthetic secrets, never real context history or credentials.
- Preserve `.pi-memory-scope.json` and unrelated local changes. Do not add transient investigation or progress reports to `docs/`.
