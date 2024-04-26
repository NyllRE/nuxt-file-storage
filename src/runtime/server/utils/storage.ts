import { writeFile, rm, mkdir } from 'fs/promises'
import { useRuntimeConfig } from '#imports'

/**
 * @returns mime type
 * @prop fileNameOrIdLength: you can pass a string or a number, if you enter a string it will be the file name, if you enter a number it will generate a unique ID
 */
export const storeFileLocally = async (
	dataurl: string,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const { binaryString, ext } = parseDataUrl(dataurl)
	const location = useRuntimeConfig().public.fileStorage.mount

	const filename =
		typeof fileNameOrIdLength == 'number'
			? generateRandomId(fileNameOrIdLength)
			: fileNameOrIdLength

	await mkdir(`${location}${filelocation}`, { recursive: true })

	await writeFile(`${location}${filelocation}/${filename}.${ext}`, binaryString, {
		flag: 'w',
	})
	return `${filename}.${ext}`
}

export const deleteFile = async (filename: string, filelocation: string = '') => {
	const location = useRuntimeConfig().public.fileStorage.mount
	await rm(`${location}${filelocation}/${filename}`)
}

const generateRandomId = (length: number) => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let randomId = ''
	for (let i = 0; i < length; i++) {
		randomId += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return randomId
}

/**
Parses a data URL and returns an object with the binary data and the file extension.
@param {string} file - The data URL
@returns {{ binaryString: Buffer, ext: string }} - An object with the binary data and the file extension
 */
export const parseDataUrl = (file: string) => {
	const arr: string[] = file.split(',')
	const mimeMatch = arr[0].match(/:(.*?);/)
	if (!mimeMatch) {
		throw new Error('Invalid data URL')
	}
	const mime: string = mimeMatch[1]
	const base64String: string = arr[1]
	const binaryString: Buffer = Buffer.from(base64String, 'base64')

	const ext = mime.split('/')[1]

	return { binaryString, ext }
}
