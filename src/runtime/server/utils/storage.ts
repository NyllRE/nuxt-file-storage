import mimeTypes from 'mime-types'
import { writeFile, rm } from 'fs/promises'
import { fileURLToPath } from 'node:url'
/**
 * @param {string} dataurl - The data URL containing the file data.
 * @param {string} filename - The desired filename.
 * @param {string} filelocation - Optional file location. Defaults to ''.
 * @returns {Promise<string>} A promise resolving to the stored filename with extension.
 */
export const storeFileLocally = async (
	dataurl: string,
	filename: string,
	filelocation: string = '',
): Promise<string> => {
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

	await writeFile(`~/${location}${filelocation}/${filename}.${ext}`, binaryString)

	return `${filename}.${ext}`
}

export const deleteFile = async (filename: string, filelocation: string = '') => {
	await rm(`${location}${filelocation}/${filename}`)
}
