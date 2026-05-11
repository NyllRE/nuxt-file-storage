// ─── Legacy (JSON / base64) ─────────────────────────────────────────────────

/**
 * File interface for the JSON / base64 upload method.
 * Used when `storageMode: 'DataURL'` is set in the composable.
 * Renamed to avoid conflict with the standard DOM `File` type.
 *
 * @deprecated Use `MultipartFileEntry` with `storageMode: 'Multipart'` instead.
 */
export interface JsonFile {
	name: string
	size: number
	type: string
	lastModified: number
	content: string // data: URL string
}

/**
 * Legacy server file representation (older versions).
 * @deprecated Use `JsonFile` interface instead.
 */
export interface ServerFile {
	name: string
	content: string
	size: string
	type: string
	lastModified: string
}

// ─── Multipart ───────────────────────────────────────────────────────────────

/**
 * Represents a single file entry from `readMultipartFormData()`.
 * This is what Nitro / h3 returns for `multipart/form-data` uploads.
 *
 * Used when `storageMode: 'Multipart'` is set in the composable.
 */
export interface MultipartFileEntry {
	name: string      // form field name (e.g. "files")
	filename: string  // original filename sent by the browser
	type: string      // MIME type
	data: Uint8Array  // raw binary content
}

// ─── Client types ────────────────────────────────────────────────────────────

export interface ClientFile extends Blob {
	content: string | ArrayBuffer | null | undefined
	name: string
	lastModified: number
}

// ─── Module options ──────────────────────────────────────────────────────────

export interface ModuleOptions {
	mount: string
	version: string
}

/**
 * @description Augment the '#imports' module to include useRuntimeConfig
 * this is only needed because this package is consumed as a module
 */
declare module '#imports' {
	export function useRuntimeConfig(): any
}
