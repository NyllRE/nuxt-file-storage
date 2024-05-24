export default defineEventHandler(async (event) => {

	const files = (await readMultipartFormData(event)) || []

	// const { files } = await readBody<{ files: File[] }>(event)
	console.log('files :>> ', files);
	const fileNames: string[] = []
	for (const file of files) {
		if (file.type) fileNames.push(await storeFileFormData(file, 12, '/specificFolder'))
	}
	return fileNames
})
