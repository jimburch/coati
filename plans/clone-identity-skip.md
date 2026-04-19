# Plan: CLI clone — skip identical files instead of prompting

> Source PRD: [#346](https://github.com/jimburch/coati/issues/346)

## Architectural decisions

Durable decisions that apply across all phases:

- **Scope**: CLI-only. No web, API, or database changes. No route or schema additions.
- **Comparison strategy**: stat-size short-circuit, then strict UTF-8 string equality. No hashing, no normalization (CRLF vs LF, trailing newlines, and BOMs all count as differences).
- **New domain type**: a `TargetClassification` discriminated union with variants `absent`, `identical`, `different`, `is-directory`, `unreadable`. This is the single source of truth for "what is at the target path relative to the incoming content."
- **Outcome taxonomy**: `WriteOutcome` extended with a fourth variant `unchanged` alongside `written`, `skipped`, `backed-up`. `WriteResult` gains an `unchanged: number` counter.
- **Flag semantics**:
  - `--force` suppresses prompts but does not force byte-level rewrites of identical files. Identity-skip is universal.
  - `--dry-run` runs full classification; only disk writes are suppressed.
  - `--json` runs full classification; differing files still auto-skip (no prompt possible). `unchanged` surfaces as an additive top-level field and as a per-file `outcome` variant.
  - No new flag for opting out of identity-skip (deferred until a real need surfaces).
- **Safety posture**: when a target cannot be classified cleanly, prefer friction over silent wrong action. Directory-at-path aborts the clone with a descriptive error naming the file. Unreadable files fall through to the normal conflict prompt so the user decides.
- **UX surface**:
  - Per-file icon `=` for `unchanged`, alongside existing `✓ written`, `↻ backed-up`, `- skipped`.
  - New summary success message `"${label} is already up to date."` when every file matches.
  - Parts list extends to `N written, N unchanged, N backed up, N skipped`.
  - The existing "all files skipped" warning only fires when nothing was written and nothing was unchanged (i.e. something was actively skipped).

---

## Phase 1: End-to-end identity-skip during clone

**User stories**: 1–14 (all user stories in the parent PRD).

### What to build

A single end-to-end tracer bullet that implements the complete feature described in the PRD.

Before prompting the user to resolve a conflict, the CLI classifies each incoming file against its target path using the new classifier. Identical files bypass the conflict prompt entirely, are reported as `unchanged` in both human-readable and JSON output, and do not touch disk. Differing files follow the existing conflict flow. Targets that are directories abort the clone with a clear error. Unreadable targets fall through to the conflict prompt so the user decides.

The feature is observable on a re-clone of any setup the user already has in sync: every file shows the `=` icon, the summary reads "already up to date," and nothing is written. In JSON mode, consumers see a new `unchanged` counter and `unchanged` per-file outcome.

All flag combinations behave correctly: `--dry-run` previews the same classifications a real run would produce, `--force` still skips identical files rather than rewriting them, `--pick` applies identity classification to the files the user selected, and `--json` emits the expanded schema.

### Acceptance criteria

- [x] Running `coati clone <setup>` twice in a row on the same project writes files the first time and shows only `unchanged` / "already up to date" the second time, with zero prompts.
- [x] Running a clone into a project where some files match and some differ only surfaces prompts for the differing files; matching files appear as `unchanged` in the summary.
- [x] The `=` icon appears for every unchanged file in the per-file output list.
- [x] The summary parts list includes `N unchanged` when applicable, alongside `N written` / `N backed up` / `N skipped`.
- [x] When every file is identical, the summary prints a success-level "already up to date" message — never the "all files were skipped" warning.
- [x] `coati clone --dry-run` previews `unchanged`, `written`, and conflict classifications exactly as a real run would, without touching disk.
- [x] `coati clone --force` does not rewrite files that are byte-identical; they still appear as `unchanged`.
- [x] `coati clone --json` output contains a top-level `unchanged: number` field and per-file records with `outcome: "unchanged"` for identical files. Existing fields remain unchanged in name and meaning.
- [x] If any incoming file targets a path that is currently a directory, the clone aborts before writing anything, with an error message naming the offending path.
- [x] If an existing target file cannot be read (permissions, broken symlink, etc.), the classifier treats it as a conflict and the file is presented in the normal conflict prompt instead of aborting the clone.
- [x] The classifier is a standalone module with unit test coverage for every variant of the discriminated union, using real tmpdir fixtures rather than mocked fs.
- [x] Integration-level tests cover: all-unchanged result shape, mixed unchanged + written, dry-run classification without writes, `--force` + identical stays unchanged, JSON mode emits `unchanged` correctly, directory-target aborts with the expected error.
- [x] `resolveConflicts` is never called with identical files; its existing tests continue to pass without modification.
- [x] `pnpm check`, `pnpm lint`, and `pnpm test:unit --run` all pass before the slice is considered done.
