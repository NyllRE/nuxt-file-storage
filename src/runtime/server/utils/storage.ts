import mimeTypes from 'mime-types'
import { writeFileSync } from 'fs'
/**
 * @returns mime type
 */
export const storeFileLocally = (dataurl: string, filename: string): string => {
	const arr: string[] = dataurl.split(',')
	const mimeMatch = arr[0].match(/:(.*?);/)
	if (!mimeMatch) {
		throw new Error('Invalid data URL')
	}
	const mime: string = mimeMatch[1]
	const base64String: string = arr[1]
	const binaryString: Buffer = Buffer.from(base64String, 'base64')

	const ext = mimeTypes.extension(mime)
	const location = useRuntimeConfig().public.nuxtStorage.location

	writeFileSync(`${location}/${filename}.${ext}`, binaryString)
	return `${filename}.${ext}`
}

export const deleteFile = async (userId: string, filename: string) => {
	try {
		const oldFiles = await getFiles(userId),
			newFiles = oldFiles.filter((file) => file !== filename)
		await storeFiles(userId, newFiles)

		fs.rm(`public/userFiles/${filename}`, () => {
			console.error(`${filename} does not exist`)
		})
	} catch {
		0
	}
}
