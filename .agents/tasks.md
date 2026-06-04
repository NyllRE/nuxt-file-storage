# Tasks — Nuxt File Storage Issue Cleanup

## Overview
Close out open GitHub issues from the v0.3.2 release cycle. The work is split into stages:

---

## Stage 1: PR #40 — Review & Document defineExpose with useFileStorage

**Issue:** #39 (closed) / PR #40 (draft, unmerged)
**Status:** The `files` ref is not iterable when exposed via `defineExpose`. The workaround is `childRef.value.files.value`.

**PR #40 changes (review):**
- Adds `createIterableRef<T>()` helper with `Symbol.iterator` on the ref
- Changes `files` from `ref<ClientFile[]>([])` to `createIterableRef<ClientFile>([])`
- Adds ~15500 lines of noise (package-lock.json, BEFORE_AFTER.md, SOLUTION_SUMMARY.md, scripts/, playground test pages)
- Adds `jsdom` to devDependencies and a separate `vitest.config.ts`

**Decision:** Do NOT merge PR #40 as-is (too much noise). Instead:
- [x] Implement `createIterableRef` helper in `useFileStorage.ts` with `Symbol.iterator`
- [x] Update README with "Using with defineExpose" section using the iterable ref
- [ ] Close PR #40

---

## Stage 2: Patch Release v0.3.3 — Close #33, #29, #36

All three are already fixed in code. Bump version, publish.

### #33 — Duplicate file extension bug
- Fixed in v0.3.2 (commit `a6ada27`): storage.ts now checks if `fileNameOrIdLength` already has the correct extension
- Covered by tests in `test/storage-filename.test.ts`
- [ ] Close issue with reference to the fix

### #29 — Add clearFiles function
- Already exists in `useFileStorage.ts:31-33`, returned at line 52
- [ ] Close issue

### #36 — File overwrite / mkdir error
- `writeFile` uses `{ flag: 'w' }` which overwrites existing files
- `mkdir` error is caught with descriptive messages in `storage.ts:87-104`
- Tests in `storage-filename.test.ts:89-101` verify overwriting works
- [ ] Close issue, noting the user's workaround is now handled properly in v0.3.2+

### Release steps:
- [ ] Bump version to v0.3.3
- [ ] Update CHANGELOG
- [ ] Run tests (`nr test`)
- [ ] Run lint (`nr lint`)
- [ ] Publish

---

## Stage 3: Major Release v0.4.0 — Multipart Upload Refactor (PR #44)

Depends on merging PR #44 (`refactor/multipart-storage-mode`). This is a significant refactor:

**Changes:**
- `storageMode: "Multipart" | "DataURL"` option in `useFileStorage` (default: Multipart)
- Renames `clearOldFiles` → `deleteOldFiles`
- Multipart mode: `files` ref is a `FormData`, ready for `$fetch`
- DataURL mode: `jsonFiles` ref for legacy base64 JSON body
- New server utils: `storeFile()` (multipart), `storeFileJson()` (legacy)
- Shared `writeToFileSystem()` helper
- New types: `MultipartFileEntry`, `File` (per docs spec); `ServerFile` retained for compat

**Impact on open issues:**
- **#34** (upload progress) — Partially addressed. Multipart enables XHR progress tracking. Need docs showing `onUploadProgress` pattern with `XMLHttpRequest` or `$fetch` with `onResponse` callback.
- **#28** (Postman uploads) — Both legacy JSON and multipart form data are now supported server-side. Document the patterns.

**Release steps:**
- [ ] Review and merge PR #44
- [ ] Resolve any merge conflicts
- [ ] Update README with new API docs
- [ ] Bump version to v0.4.0
- [ ] Run tests, lint, publish

---

## Stage 4: Upload Progress Docs (#34)

After v0.4.0 is released, add documentation showing how to track upload progress:
- [ ] Add README section: "Watching upload progress"
- [ ] Show `XMLHttpRequest` + `xhr.upload.onprogress` pattern with FormData
- [ ] Close #34 with reference to the docs

---

## Issue Reference Table

| # | Type | Title | Stage | Action |
|---|------|-------|-------|--------|
| 40 | PR (draft) | Iterable ref for defineExpose | 1 | Review & close; update docs |
| 33 | Bug | Duplicate file extension | 2 | Close (fixed in v0.3.2) |
| 29 | Feature | Add clearFiles() | 2 | Close (already implemented) |
| 36 | Question | File overwrite/replace | 2 | Close (fixed in v0.3.2) |
| 44 | PR (open) | Multipart upload refactor | 3 | Review, merge, release v0.4.0 |
| 34 | Feature | Upload progress | 4 | Document after v0.4.0 |
| 28 | Question | Postman/external uploads | 3 | Document after v0.4.0 |
