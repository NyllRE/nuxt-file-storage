export interface ServerFile {
	name: string
	content: string
	size: string
	type: string
	lastModified: string
}

export interface ClientFile extends Blob {
	content: string | ArrayBuffer
	name: string
	lastModified: number
}
