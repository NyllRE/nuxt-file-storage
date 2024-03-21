import { storeFileLocally } from '../../../../../src/runtime/server/utils/storage'

export default defineEventHandler(async (event) => {
	const body = await readBody<{ files: File[] }>(event)
	console.dir(body)

	const fileNames: string[] = []
	for (const file of body.files) {
		fileNames.push(storeFileLocally(file.content, file.name))
	}
	return fileNames
})

interface File {
	name: string
	content: string
}
