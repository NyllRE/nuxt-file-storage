# v0.4.0 — Multipart Upload Refactor Plan

## Branch

`refactor/multipart-storage-mode`

Created from `master` (v0.3.3).

---

## 1. User Clarifications (from discussion)

| Point | Decision |
|-------|----------|
| Default `storageMode` | **`'Multipart'`** (not DataURL). This is a **breaking default change**. |
| `handleJsonFileInput` / `jsonFiles` | **Not needed.** Just `handleFileInput` and `files` for both modes. The TypeScript type of `files` changes based on the mode. |
| `submit()` helper | An **abstraction over `$fetch`**. Auto-sets `method: 'POST'` and the correct `body` shape. Accepts all ofetch options passed through. Must work with `useAsyncData`: `useAsyncData('key', () => submit('/api/files'))`. |
| Progress tracking | Part of v0.4.0, not deferred. Should be built into `submit` — when `onProgress` is provided, switch to XHR internally (still returns a promise, still works with `useAsyncData`). |
| Design rules | ① Perfect defaults, simple implementation ② Extendable |

---

## 2. Breaking Changes (v0.3.x → v0.4.0)

| # | Change | Impact | Mitigation |
|---|--------|--------|------------|
| B1 | `clearOldFiles` → `deleteOldFiles` | Existing `useFileStorage()` calls with option get TS error | Keep `clearOldFiles` as deprecated alias |
| B2 | `storeFileLocally` → `storeFile` (accepts `ServerFile` directly) | Server code imports break | Keep `storeFileLocally` as deprecated wrapper calling `storeFile` |
| B3 | **Default `storageMode` changed to `'Multipart'`** | `files` ref API stays identical in both modes — `file.data` is always a blob URL. Only `submit()` behavior changes (FormData vs JSON). | Users wanting old DataURL body shape set `storageMode: 'DataURL'` |
| B4 | `ClientFile.data` changed from DataURL string to blob URL | v0.3.x `file.data` was a DataURL (`data:image/...`). v0.4.0 always uses a `blob:` URL. If anyone reads `file.data` expecting a DataURL string, it breaks. | Use `file.name`, `file.size`, etc. for metadata. Use `<img :src="file.data">` for previews. |
| B5 | `ServerFile` field renamed: `content` → `data`, type widened | v0.3.x had `content: string` (DataURL). v0.4.0 has `data: Buffer \| string` — Buffer for multipart, string for JSON. Matches `ClientFile.data`. |

---

## 3. Types (`src/runtime/types.ts`)

### Data flow: from input to disk

**Both modes — frontend preview (identical):**
```
Browser File  →  URL.createObjectURL(file)  →  blob: URL for <img :src>
             →  stored in nativeFiles[] for later submit()
```

**DataURL (JSON) mode — submit:**
```
nativeFiles[]  →  FileReader.readAsDataURL (batch)
  →  JSON body: [{ name, size, type, lastModified, data: "data:..." }]
  →  Server receives ServerFile[] with data as DataURL string
  →  storeFile → typeof data === 'string' → parseDataUrl(data) → Buffer → writeFile
```

**Multipart mode — submit:**
```
nativeFiles[]  →  FormData.append  →  multipart/form-data encoding
  →  readMultipartFormData(event)  →  part.data is already Buffer
  →  storeFile → typeof data === 'object' → data is Buffer → writeFile
```

Both paths converge in `storeFile` with the same `typeof` check.

### Unified `ServerFile`

```typescript
export interface ServerFile {
  name: string          // original filename including extension
  size: number          // file size in bytes
  type: string          // MIME type
  lastModified: number  // Unix timestamp in ms
  data: Buffer | string // Buffer (multipart) or DataURL string (JSON)
}
```

`data` accepts both because the transport dictates the type:
- **Multipart**: `data` is `Buffer` (from `readMultipartFormData`)
- **JSON**: `data` is a DataURL string (from the frontend's serialized file)

### storeFile normalizes internally

```typescript
export const storeFile = async (file: ServerFile, ...): Promise<string> => {
  const buffer = typeof file.data === 'string'
    ? parseDataUrl(file.data).binaryString  // DataURL → Buffer
    : file.data                              // already Buffer

  const ext = file.name.includes('.') ? (file.name.split('.').pop() as string) : ''
  return writeToFileSystem(buffer, fileNameOrIdLength, filelocation, file.name, ext)
}
```

The user never thinks about Buffers or DataURLs — `storeFile` handles the conversion transparently.

### Usage in API routes

**JSON route:**
```typescript
const { files } = await readBody<{ files: ServerFile[] }>(event)
for (const file of files) await storeFile(file, 8, '/userFiles')
// file.data is a DataURL string — storeFile detects this and parses it
```

**Multipart route:**
```typescript
const files = await multipartToServerFiles(event)
for (const file of files) await storeFile(file, 8, '/userFiles')
// file.data is already Buffer — storeFile writes directly
```

**No separate `MultipartFileEntry` type needed.** One type, one function, two transport paths.

### `ClientFile` (frontend — same shape both modes)

```typescript
export interface ClientFile {
  data: string   // always a blob: URL for preview
  name: string
  lastModified: number
  size: number
  type: string
}
```

**Both modes produce identical `ClientFile` entries.** The only internal difference is in `submit()`:
- `handleFileInput` → `URL.createObjectURL(nativeFile)` always — O(1), zero copy
- `file.data` is always a `blob:` URL — works with `<img :src="file.data">` in both modes
- `clearFiles()` calls `URL.revokeObjectURL(file.data)` for all entries

The DataURL serialization (`FileReader.readAsDataURL`) only happens inside `submit()` in DataURL mode, as a batch operation before the fetch. In Multipart mode, no serialization happens at all — files go straight into FormData.

This is the most performant and most unified design: `files.value` is typed identically, preview works the same, and the encoding cost is deferred to submit time (or avoided entirely in Multipart mode).

### Unified `storeFile` input

```typescript
export const storeFile = async (
  file: ServerFile,
  fileNameOrIdLength: string | number,
  filelocation: string = ''
): Promise<string> => {
  const buffer = typeof file.data === 'string'
    ? parseDataUrl(file.data).binaryString
    : file.data

  const ext = file.name.includes('.') ? (file.name.split('.').pop() as string) : ''
  return writeToFileSystem(buffer, fileNameOrIdLength, filelocation, file.name, ext)
}
```

Same function, same type, same behavior — `storeFile` handles the `Buffer \| string` normalization transparently.

### ModuleOptions

```typescript
export interface ModuleOptions {
  mount: string
  version: string
}
```

---

## 4. Composable Design (`useFileStorage.ts`)

### Options

```typescript
type Options = {
  deleteOldFiles?: boolean
  /** @deprecated use deleteOldFiles */
  clearOldFiles?: boolean
  storageMode?: 'Multipart' | 'DataURL'  // default: 'Multipart'
  onProgress?: (percentage: number) => void  // default global progress handler
  fileInputRef?: Ref<HTMLInputElement | null>  // optional input ref for auto-clearing
}
```

### Return Type (same shape both modes)

```typescript
{
  files: Ref<ClientFile[]> & Iterable<ClientFile>,  // always iterable, always .value
  handleFileInput: (event) => Promise<void>,
  clearFiles: (inputRef?) => void,
  submit: (endpoint, opts?) => Promise<any>,
}
```

The return type is **identical** in both modes. User code like `v-for="file in files"`, `files.value.length`, `file.name`, `<img :src="file.data">` works without changes regardless of `storageMode`.

### Internal state

```typescript
const clientFiles = createIterableRef<ClientFile>([])  // exposed as `files` — blob URLs for preview
const nativeFiles: File[] = []                          // internal — raw File objects for submit()
```

`nativeFiles` is used by both modes:
- **Multipart**: appended directly to FormData
- **DataURL**: serialized to DataURLs via `FileReader.readAsDataURL` at submit time

### handleFileInput

```typescript
const handleFileInput = async (event: any) => {
  if (shouldDeleteOld) clearFiles()

  for (const nativeFile of event.target.files) {
    // Identical in both modes — blob URL for preview
    clientFiles.value.push({
      name: nativeFile.name,
      size: nativeFile.size,
      type: nativeFile.type,
      lastModified: nativeFile.lastModified,
      data: URL.createObjectURL(nativeFile),   // blob: URL — O(1), zero copy
    } as ClientFile)

    nativeFiles.push(nativeFile)  // store raw File for submit()
  }
}
```

### clearFiles

```typescript
const clearFiles = (overrideFileInputRef?: Ref<HTMLInputElement | null>) => {
  // Revoke blob URLs (both modes — always blob: URLs for preview)
  for (const f of clientFiles.value) {
    URL.revokeObjectURL(f.data)
  }

  clientFiles.value.splice(0, clientFiles.value.length)
  nativeFiles.length = 0

  const inputRef = overrideFileInputRef ?? options.fileInputRef
  const el = inputRef ? unref(inputRef) : null
  if (el) el.value = ''
}
```

**Key behavior:** If the user passed `fileInputRef` in options, `clearFiles()` clears the input automatically — even when called internally by `handleFileInput`. Manual override param still works for ad-hoc cases.

### submit — The Core Design

`submit` is a thin wrapper around `$fetch` that:
- Sets `method: 'POST'` (overridable via opts)
- Sets `body` automatically based on storage mode
- Merges `extraBody` fields into the body for DataURL mode

**Why this works with `useAsyncData`:**
```typescript
const { data } = await useAsyncData('upload', () => submit('/api/files'))
// submit() returns a Promise — useAsyncData accepts () => Promise
```

**When onProgress is provided, swaps to XHR internally** (keeps promise interface):
```typescript
const { data } = await useAsyncData('upload', () =>
  submit('/api/files', {
    onProgress: (pct) => console.log(`${pct}%`)
  })
)
// Still returns Promise — XHR wrapped in a promise
```

**Signature:**
```typescript
const submit = async (
  endpoint: string,
  opts?: SubmitOptions & Omit<FetchOptions, 'body'>
): Promise<any>
```

Where `SubmitOptions` adds:
```typescript
type SubmitOptions = {
  extraBody?: Record<string, any>   // merged for DataURL mode
  onProgress?: (percentage: number) => void
  // All other ofetch options pass through (method, headers, signal, query, params, onRequest, onResponse, etc.)
}
```

**Implementation pseudocode:**
```typescript
const submit = async (endpoint, opts) => {
  const { extraBody, onProgress, ...fetchOptions } = opts || {}
  const progressCb = onProgress ?? options.onProgress

  if (isMultipart) {
    const formData = new FormData()
    for (const file of nativeFiles) {
      formData.append(file.name, file)
    }

    if (progressCb) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) progressCb(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => resolve(JSON.parse(xhr.responseText))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('POST', endpoint)
        if (fetchOptions.signal) fetchOptions.signal.addEventListener('abort', () => xhr.abort())
        if (fetchOptions.headers) set XHR headers
        xhr.send(formData)
      })
    }
    return $fetch(endpoint, {
      method: 'POST',
      body: formData,
      ...fetchOptions,
    })
  }

  // DataURL mode — serialize to DataURLs at submit time (not during handleFileInput)
  const serialized = await Promise.all(
    nativeFiles.map(async (file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      data: await fileToDataUrl(file),
    }))
  )
  return $fetch(endpoint, {
    method: 'POST',
    body: { files: serialized, ...(extraBody ? extraBody : {}) },
    ...fetchOptions,
  })
}
```

Where `fileToDataUrl` is the same `FileReader.readAsDataURL` helper as v0.3.x's `serializeFile` — but now only runs at submit time, not on every file input change.

---

## 5. Server Utils (`storage.ts`)

### writeToFileSystem (shared helper)

Extracts the common extension-validation + mkdir + write logic from the current `storeFileLocally`:

```
binaryData + fileNameOrIdLength + filelocation + originalFileName + originalExt
  → validate → mkdir → writeFile → return filename
```

### Unified `storeFile` — normalizes `data` internally

Since `ServerFile.data` can be `Buffer \| string`, `storeFile` normalizes before writing:

```typescript
export const storeFile = async (
  file: ServerFile,
  fileNameOrIdLength: string | number,
  filelocation: string = ''
): Promise<string> => {
  const buffer = typeof file.data === 'string'
    ? parseDataUrl(file.data).binaryString
    : file.data

  const ext = file.name.includes('.') ? (file.name.split('.').pop() as string) : ''
  return writeToFileSystem(buffer, fileNameOrIdLength, filelocation, file.name, ext)
}
```

No branching for the user — `storeFile` handles the `Buffer \| string` normalization transparently.

**JSON route usage:**
```typescript
const { files } = await readBody<{ files: ServerFile[] }>(event)
await storeFile(files[0], 8, '/userFiles')
```

### `multipartToServerFiles` — one-liner helper for multipart routes

Ship a utility that reads multipart form data and returns `ServerFile[]`:

```typescript
import type { H3Event } from 'h3'
import { readMultipartFormData } from 'h3'

export const multipartToServerFiles = async (event: H3Event): Promise<ServerFile[]> => {
  const parts = (await readMultipartFormData(event)) || []
  return parts.map((part) => ({
    name: part.filename || part.fieldName || 'file',
    size: part.data.length,
    type: part.type || 'application/octet-stream',
    lastModified: Date.now(),   // approximated; not native to multipart
    data: part.data,
  }))
}
```

Multipart and JSON routes now read identically:

```typescript
// Multipart route
const files = await multipartToServerFiles(event)
for (const file of files) await storeFile(file, 8, '/userFiles')

// JSON route
const { files } = await readBody<{ files: ServerFile[] }>(event)
for (const file of files) await storeFile(file, 8, '/userFiles')
```

For custom metadata (e.g. exact `lastModified` from a dedicated form field), users can build `ServerFile[]` directly from parts instead of using the helper — but the helper covers the 95% case.

### storeFileLocally (deprecated)

```typescript
/** @deprecated Use storeFile instead. Will be removed in v0.5.0. */
export const storeFileLocally = async (
  file: ServerFile,
  fileNameOrIdLength: string | number,
  filelocation: string = ''
): Promise<string> => {
  console.warn('[nuxt-file-storage] storeFileLocally is deprecated, use storeFile')
  return storeFile(file, fileNameOrIdLength, filelocation)
}
```

`storeFileLocally` now accepts `ServerFile` (where v0.3.x used a different `ServerFile` with `content: string`), so existing callers may need to adjust if they relied on the old type. The function body is a simple redirect.

---

## 6. Defaults

| Setting | Default | Why |
|---------|---------|-----|
| `storageMode` | `'Multipart'` | Modern approach, smaller payloads, enables progress |
| `deleteOldFiles` | `true` | Same behavior as v0.3.x `clearOldFiles: true` |
| `method` in submit | `'POST'` | REST convention for file uploads |

---

## 7. Migration Strategy

### What breaks silently (no TS error but behavior changes):

- `files.value[i].data` in v0.3.x was a DataURL string; in v0.4.0 it's a `blob:` URL. If users stored `file.data` for later use outside `<img>` tags, it will break. Use `file.name`, `file.size`, etc. for metadata, and `<img :src="file.data">` for previews.

### What needs user action:

| Scenario | Migration |
|----------|-----------|
| `useFileStorage({ clearOldFiles: false })` | → `{ deleteOldFiles: false }` |
| `storeFileLocally(file, 8, '/folder')` | → `storeFile(file, 8, '/folder')` |
| Wants old DataURL behavior | → `{ storageMode: 'DataURL' }` |
| Manual `$fetch` for upload (any mode) | → Use `submit('/api')` which auto-selects the right body shape |
| `files.value[i].content` accessing file payload (v0.3.x) | → `files.value[i].data` is now always a blob URL for preview; no base64 content field |

---

## 8. Progress Indicator (#34)

### Built into `submit()`

```typescript
const { handleFileInput, submit } = useFileStorage({ storageMode: 'Multipart' })

// Without progress (uses $fetch internally)
const result = await submit('/api/files')

// With progress (uses XHR internally, still returns promise)
const result = await submit('/api/files', {
  onProgress: (pct) => console.log(`${pct}%`)
})

// With useAsyncData + progress
const { data, pending } = useAsyncData('upload', () =>
  submit('/api/files', {
    onProgress: console.log
  })
)
```

### Why not use ofetch's own progress?

`ofetch` (Nuxt's `$fetch`) does not support **upload** progress events (only download progress via `onDownloadProgress`). Upload progress requires the `xhr.upload.onprogress` event from `XMLHttpRequest`. The `submit` helper abstracts this — when `onProgress` is provided, it transparently uses XHR; when omitted, it uses `$fetch`.

### DataURL mode limitation

Progress tracking is not practical for DataURL mode — files are Base64-encoded client-side before the HTTP request even starts. The `onProgress` callback is ignored in DataURL mode. Document this.

### `lastModified` in Multipart mode

When `submit()` sends files via `FormData` in Multipart mode, the browser's multipart encoding includes the filename, MIME type, and binary data — but **not** the `lastModified` timestamp. On the server side, `lastModified` is approximated to `Date.now()`. If users need exact `lastModified`, they can append it as an extra form field or send it via the `extraBody` mechanism in a follow-up request.

---

## 9. File-by-File Implementation Plan

| File | Action | Details |
|------|--------|---------|
| `src/runtime/types.ts` | ✅ Already done | Unified `ServerFile` (name, size, type, lastModified, data: Buffer \| string); `ClientFile` drops `extends Blob`, uses `data: string` (blob URL) |
| `src/runtime/server/utils/storage.ts` | UPDATE | Has `writeToFileSystem`, `storeFile`, deprecated `storeFileLocally`. Add `multipartToServerFiles(event)` helper. |
| `src/runtime/composables/useFileStorage.ts` | REWRITE | Multipart default; dual-mode files; submit helper; function overloads; `fileInputRef` option |
| `src/module.ts` | UPDATE | Update `ServerFile` type in template declarations |
| `test/composable-iterable.test.ts` | REWRITE | Tests for both storage modes, submit helper, fileInputRef option |
| `test/storage.test.ts` | UPDATE | Tests for `storeFile` with full ServerFile |
| `test/storage-filename.test.ts` | UPDATE | Tests for deprecated `storeFileLocally` calling `storeFile` |
| `playground/app/app.vue` | REWRITE | Demo both modes, pass `fileInputRef` in options |
| `playground/server/api/files.ts` | REWRITE | Demo `storeFile` with multipart + JSON |
| `README.md` | REWRITE | See structure below |

---

## 10. README Structure

1. **Intro** — badges, features
2. **Quick Setup** — install, config
3. **Configuration** — `mount`, `storageMode`
4. **Frontend Usage**
   - Basic (`handleFileInput`, `files`, default Multipart)
   - With `storageMode: 'DataURL'` (backward compat path)
   - `deleteOldFiles` option 
   - `clearFiles(fileInputRef?)`
   - `submit()` helper + progress + `useAsyncData` integration
   - Multiple input fields
   - `defineExpose` iterable ref (DataURL mode)
 5. **Backend Usage**
    - Unified `storeFile()` — handles both multipart and JSON
    - `multipartToServerFiles(event)` helper — one-call multipart parsing
    - Usage examples for both input types
   - Other utils: `deleteFile`, `getFileLocally`, `getFilesLocally`, `retrieveFileLocally`, `parseDataUrl`
   - Updating files (overwrite behavior)
6. **Upload Progress** — #34
7. **Migration Guide** — v0.3.x → v0.4.0
8. **Contribution**

---

## 11. Implementation Order

1. ✅ Types
2. ✅ Server utils  
3. 🔲 Module declarations update
4. 🔲 Composable rewrite (useFileStorage)
5. 🔲 Test updates
6. 🔲 Playground updates
7. 🔲 README rewrite
8. 🔲 Lint + test pass
9. 🔲 v0.4.0-beta.0 release

---

## 12. Open Questions (for user)

1. In DataURL mode, when user calls `submit()`, the body shape is `{ files: files.value }`. The docs also mention users might want to add other JSON fields. The `extraBody` option in `submit` merges these. Is `extraBody` enough, or should we also support passing a custom `body` that overrides entirely?

2. For the `submit` helper with `useAsyncData`: `useAsyncData` caches results by key. If the user calls `submit('/api/files')` directly without `useAsyncData`, it should behave like a one-shot fetch. If they wrap it in `useAsyncData`, Nuxt handles caching/SSR. Any concerns about this pattern?

3. Should `submit` accept an absolute URL or could it also accept a Nuxt route object / path builder for typed routes?
