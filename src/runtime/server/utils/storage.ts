import { writeFile, rm, mkdir } from 'fs/promises'
import { MultiPartData } from 'h3'
import { useRuntimeConfig } from '#imports'
import { extname } from 'path'

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


/**
 *	URL address splicing
 * @param arg string
 * @returns string
 * @example
 * pathJoin('upload','image','/2024/5','demo.png')	// upload/image/2024/5/demo.png
 */
export const pathJoin = (...arg: string[]) => {
	const arr: string[] = []
	arg.forEach((item) => {
		item = item?.toString()?.trim()
		if (!item) return
		// Remove the leading slash,The first value of `arr` is not processed.
		if (item.startsWith('/') && arr.length > 0) item = item.slice(1)
		// Remove the trailing slash
		if (item.endsWith('/')) item = item.slice(0, -1)
		arr.push(item)
	})
	return arr.join('/')
}


/**
 * Save the 'FormData' data type method
 * @param fileData file data
 * @param fileNameOrIdLength fileNameOrIdLength: you can pass a string or a number, if you enter a string it will be the file name, if you enter a number it will generate a unique ID
 * @param filelocation filelocation: the directory where you want to store the file, you can pass an empty string if you want to store the file in the root directory
 * @returns promise
 * @example
 * ```ts
 * await storeFileFormData(file, 'test', '/upload')	// /upload/test.png
 * ```
 */
export const storeFileFormData = async (
	fileData: MultiPartData,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {

	const ext = extname(fileData.filename) // .png
	const location = useRuntimeConfig().public.fileStorage.mount

	const filename =
		typeof fileNameOrIdLength == 'number'
			? generateRandomId(fileNameOrIdLength)
			: fileNameOrIdLength

	const dir = pathJoin(location, filelocation)
	const saveFilename = filename + ext

	await mkdir(dir, { recursive: true })

	await writeFile(pathJoin(dir, saveFilename), fileData.data, {
		flag: 'w',
	})
	return saveFilename
}
