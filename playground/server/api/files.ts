export default defineEventHandler(async (event) => {
	const files = (await readMultipartFormData(event)) || []

	const fileNames: string[] = []

	for (const file of files) {
		fileNames.push(
			await storeFile(
				file,          // the file object
				'fileName',    // you can add a name for the file or length of Unique ID that will be automatically generated!
				'/specificFolder' // the folder the file will be stored in
			)
		)
	}

	// ? test traversal attack prevention
	// await storeFile(files[0], 4, '../')
	return fileNames
})
