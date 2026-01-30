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

/**
 * @description Augment the '#imports' module to include useRuntimeConfig
 * this is only needed because this package is consumed as a module
 */
declare module '#imports' {
  export function useRuntimeConfig(): any
}
