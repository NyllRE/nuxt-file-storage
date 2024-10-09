interface ServerFile {
	name: string
	content: string
	size: string
	type: string
	lastModified: string
}

interface ClientFile extends Blob {
	content: string | ArrayBuffer
	name: string
	lastModified: number
}
