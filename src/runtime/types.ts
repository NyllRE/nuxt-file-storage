export interface File {
	name: string
	size: number
	type: string
	lastModified: number
	content: string
}

export interface MultipartFileEntry {
	filename: string
	data: Buffer
	type: string
	fieldName?: string
}

/** @deprecated Use `File` instead. Will be removed in v0.5.0. */
export interface ServerFile {
	name: string
	content: string
	size: string
	type: string
	lastModified: string
}

export interface ClientFile extends Blob {
	content: string | ArrayBuffer | null | undefined
	name: string
	lastModified: number
}

export interface ModuleOptions {
	mount: string
	version: string
}

declare module '#imports' {
  export function useRuntimeConfig(): any
}
