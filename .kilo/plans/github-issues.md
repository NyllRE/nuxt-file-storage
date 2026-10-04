# Plan: Close Out Open GitHub Issues

## Current State (v0.3.2 + 3 commits after)

Since the last release (v0.3.2), 7 issues have been closed and 7 remain open. Below is an analysis and action plan.

---

## Already Resolved — Close Without Code Changes

### #33 — "storeFileLocally adds duplicate file extension when a filename is provided"
- **Status:** Already fixed in v0.3.2 (commit `a6ada27`).
- **Evidence:** `src/runtime/server/utils/storage.ts:59-79` now checks if the provided filename already has the correct extension and handles all cases correctly. Tests in `test/storage-filename.test.ts:49-86` cover this.
- **Action:** Close the issue with a note pointing to the fix.

### #29 — "Add a function to easily clear the files list"
- **Status:** Already implemented.
- **Evidence:** `src/runtime/composables/useFileStorage.ts:31-33` has `clearFiles()` and it is returned from the composable at line 52.
- **Action:** Close the issue — `clearFiles()` is available in `useFileStorage`.

### #36 — "How to replace existing file on a server"
- **Status:** Already working in v0.3.2.
- **Evidence:** `storeFileLocally` uses `writeFile(targetPath, ..., { flag: 'w' })` at `storage.ts:109-111` which overwrites existing files. Tests in `storage-filename.test.ts:89-101` verify overwriting works. The user's EEXIST error was from a file-path collision (a file existed where `mkdir` expected a directory), which is now caught with a descriptive error at `storage.ts:90-104`.
- **Action:** Close with explanation that file overwriting works via `{ flag: 'w' }` and the mkdir EEXIST case now has a clear error message.

---

## Documentation / Housekeeping

### #28 — "How to handle upload directly from Postman?"
- **Status:** Question/discussion with 18 comments. Already answered in the thread.
- **Action:** Close with a brief FAQ-style doc addition to README explaining that external uploads work by sending a JSON body matching the `ServerFile` type format (`{ name, content, size, type, lastModified }`), and that the multipart PR (#44) will provide an even cleaner API via `readMultipartFormData`.

---

## Needs PR Review / Code Changes

### #44 (PR) — "refactor: multipart upload support with storageMode API"
- **Status:** Owner's own branch, open and unmerged. Significant refactor:
  - Adds `storageMode: "Multipart" | "DataURL"` option to `useFileStorage`
  - Multipart mode uses FormData instead of base64 JSON (avoids OOM on large files — addresses #43)
  - Renames `clearOldFiles` → `deleteOldFiles`
  - Adds `storeFile()` for multipart, `storeFileJson()` for legacy
  - Updates playground and adds 34 tests
- **Action:** Review and merge PR #44. The branch is `refactor/multipart-storage-mode`. After merging:
  - Large file memory issues (#43 context) are addressed by multipart support
  - Upload progress (#34) becomes possible (FormData + XMLHttpRequest)
  - External uploads (#28) have a cleaner path via `readMultipartFormData`

### #40 (PR) — "Fix: Make files ref iterable when exposed via defineExpose"
- **Status:** Draft PR by GitHub Copilot, never merged. Linked to already-closed #39.
- **Action:** Decide: 
  - **Option A:** Merge — adds `Symbol.iterator` to the `files` ref so `childRef.value.files` can be iterated without `.value`. Nice DX enhancement.
  - **Option B:** Close — #39 is already closed and the workaround (`files.value`) is documented.
  - **Recommendation:** Close as unnecessary since #39 was resolved by documentation, but if time permits, it's a small ergonomic win.

### #34 — "File upload progress"
- **Status:** Feature request. Cannot be fully resolved without a different upload mechanism.
- **Action:** Partially addressed by merging PR #44 — multipart mode uses FormData which can be uploaded via XMLHttpRequest with `xhr.upload.onprogress`. Document this in README as a "watching upload progress" section showing the XHR pattern. Full progress support would require refactoring `handleFileInput`/`handleMultipartFileInput` to optionally accept an `onProgress` callback.

---

## Execution Order

1. **Close #33, #29, #36** — already resolved, no code changes (just add closing comments referencing the code/tests)
2. **Merge PR #44** — review branch `refactor/multipart-storage-mode`, resolve conflicts, merge to master
3. **Post-merge #44** — verify tests pass, update README with multipart docs + upload progress example + external upload section
4. **Close #28** — after README update covering external uploads
5. **Close #34** — after adding upload progress docs (acknowledge partial support)
6. **Resolve PR #40** — close as unnecessary or merge as enhancement
7. **Cut release v0.4.0** — since PR #44 has breaking changes (`clearOldFiles` → `deleteOldFiles`, `storageMode` option)
