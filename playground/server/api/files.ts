import type { ServerFile } from '../../../src/types'

export default defineEventHandler(async (event) => {
	const { files } = await readBody<{ files: ServerFile[] }>(event)
	const fileNames: string[] = []
	for (const file of files) {
		fileNames.push(await storeFileLocally(file, 12, '/specificFolder'))
	}
	return fileNames
})
