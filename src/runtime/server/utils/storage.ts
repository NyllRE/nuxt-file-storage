import { writeFile, rm, mkdir, readdir } from 'fs/promises'
import { useRuntimeConfig } from '#imports'
import type { ServerFile } from '../../../types'
import path from 'path'

/**
 * #### Will store the file in the specified directory
 * @returns file name: `${filename}`.`${fileExtension}`
 * @prop `file`: provide the file object
 * @prop `fileNameOrIdLength`: you can pass a string or a number, if you enter a string it will be the file name, if you enter a number it will generate a unique ID
 * @prop `filelocation`: provide the folder you wish to locate the file in
 *
 * [Documentation](https://github.com/NyllRE/nuxt-file-storage#handling-files-in-the-backend)
 *
 * ---
 *
 * #### Example
 *
 * ```ts
 * import { ServerFile } from "nuxt-file-storage";
 *
 * const { file } = await readBody<{ files: ServerFile }>(event)

 * await storeFileLocally( file, 8, '/userFiles' )
 * ```
 */
export const storeFileLocally = async (
	file: ServerFile,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const { binaryString, ext } = parseDataUrl(file.content)
	const location = useRuntimeConfig().public.fileStorage.mount

	//? Extract the file extension from the original filename
	const originalExt = file.name.toString().split('.').pop() || ext

	const filename =
		typeof fileNameOrIdLength == 'number'
			? `${generateRandomId(fileNameOrIdLength)}.${originalExt}`
			: `${fileNameOrIdLength}.${originalExt}`

	await mkdir(path.join(location, filelocation), { recursive: true })

	await writeFile(path.join(location, filelocation, filename), binaryString as any, {
		flag: 'w',
	})

	return filename
}

/**
 * #### Get file path in the specified directory
 * @returns file path: `${config.fileStorage.mount}/${filelocation}/${filename}`
 * @prop `filename`: provide the file name (return of storeFileLocally)
 * @prop `filelocation`: provide the folder you wish to locate the file in
 */
export const getFileLocally = (filename: string, filelocation: string = ''): string => {
	const location = useRuntimeConfig().public.fileStorage.mount
	const normalizedFilelocation = filelocation.startsWith('/') ? filelocation.slice(1) : filelocation;
	return path.join(location, normalizedFilelocation, filename)
}


/**
 * #### Get all files in the specified directory
 * @returns all files in filelocation: `${config.fileStorage.mount}/${filelocation}`
 * @prop `filelocation`: provide the folder you wish to locate the file in
 */
export const getFilesLocally = async (filelocation: string = ''): Promise<string[]> => {
	const location = useRuntimeConfig().public.fileStorage.mount
	const normalizedFilelocation = filelocation.startsWith('/') ? filelocation.slice(1) : filelocation;
	return await readdir(path.join(location, normalizedFilelocation)).catch(() => [])
}


/**
 * @param `filename`: the name of the file you want to delete
 * @param `filelocation`: the folder where the file is located, if it is in the root folder you can leave it empty, if it is in a subfolder you can pass the name of the subfolder with a preceding slash: `/subfolder`
 */
export const deleteFile = async (filename: string, filelocation: string = '') => {
	const location = useRuntimeConfig().public.fileStorage.mount
	const normalizedFilelocation = filelocation.startsWith('/') ? filelocation.slice(1) : filelocation;
	await rm(path.join(location, normalizedFilelocation, filename))
}


/**
 *
 * @param `length` the length of the random ID
 * @returns a random ID with the specified length
 */
const generateRandomId = (length: number) => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let randomId = ''
	for (let i = 0; i < length; i++) {
		randomId += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return randomId
}

/**
 * Parses a data URL and returns an object with the binary data and the file extension.
 * @param {string} file - The data URL
 * @returns {{binaryString: Buffer, ext: string}} - An object with the binary data - file extension
 *
 *
 * ```ts
 *   const { binaryString, ext } = parseDataUrl(file.content)
 * ```
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
