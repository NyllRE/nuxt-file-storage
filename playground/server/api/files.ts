// import { storeFileLocally } from '../../../src/runtime/server/utils/storage'
import { storeFileLocally } from '#nuxt/file-storage'

export default defineEventHandler(async (event) => {
	const { files } = await readBody<{ files: File[] }>(event)
	const fileNames: string[] = []
	for (const file of files) {
		fileNames.push(await storeFileLocally(file.content, 12, '/specificFolder'))
	}
	return fileNames
})

interface File {
	name: string
	content: string
}
