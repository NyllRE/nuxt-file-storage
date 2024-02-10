import mimeTypes from 'mime-types'
import { writeFile, rm } from 'fs'
import { fileURLToPath } from 'node:url'
/**
 * @returns mime type
 */
export const storeFileLocally = (
	dataurl: string,
	filename: string,
	filelocation: string = '',
): string => {
	const arr: string[] = dataurl.split(',')
	const mimeMatch = arr[0].match(/:(.*?);/)
	if (!mimeMatch) {
		throw new Error('Invalid data URL')
	}
	const mime: string = mimeMatch[1]
	const base64String: string = arr[1]
	const binaryString: Buffer = Buffer.from(base64String, 'base64')

	const ext = mimeTypes.extension(mime)

	const location = useRuntimeConfig().public.nitroStorage.location

	// const storagePath = fileURLToPath(new URL(`./${location}`))
	console.log(import.meta.url)

	writeFile(`~/${location}${filelocation}/${filename}.${ext}`, binaryString, (err) => {
		if (err) throw err
	})

	return `${filename}.${ext}`
}

export const deleteFile = async (filename: string, filelocation: string = '') => {
	rm(`${location}${filelocation}/${filename}`, () => {
		console.error(`${filename} does not exist`)
	})
}
