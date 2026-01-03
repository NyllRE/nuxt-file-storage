import { writeFile, rm, mkdir, readdir } from 'fs/promises'
import type { ServerFile } from '../../../types'
import type { H3Event, EventHandlerRequest } from 'h3'
import path from 'path'
import {
	normalizeRelative,
	isSafeBasename,
	ensureSafeBasename,
	resolveAndEnsureInside,
} from './path-safety'
import { createError, useRuntimeConfig } from '#imports'
import { createReadStream, promises as fsPromises } from 'fs'

const getMount = (): string | undefined => {
	try {
		return useRuntimeConfig().public.fileStorage.mount
	} catch (err) {
		// when running outside of a Nuxt context (tests), fall back to env var
		return process.env.FILE_STORAGE_MOUNT || process.env.NUXT_FILE_STORAGE_MOUNT
	}
}

/**
 * @description Will store the file in the specified directory
 * @param file provide the file object
 * @param fileNameOrIdLength you can pass a string or a number, if you enter a string it will be the file name, if you enter a number it will generate a unique ID
 * @param filelocation provide the folder you wish to locate the file in
 * @returns file name: `${filename}`.`${fileExtension}`
 *
 *
 * [Documentation](https://github.com/NyllRE/nuxt-file-storage#handling-files-in-the-backend)
 *
 *
 * @example
 * ```ts
 * import type { ServerFile } from "nuxt-file-storage";
 *
 * export default defineEventHandler(async (event) => {
 * 	const { file } = await readBody<{ file: ServerFile }>(event);
 * 	await storeFileLocally( file, 8, '/userFiles' );
 * })
 * ```
 */
export const storeFileLocally = async (
	file: ServerFile,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const { binaryString, ext } = parseDataUrl(file.content)
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')

	//? Extract the file extension from the original filename
	const originalExt = file.name.toString().split('.').pop() || ext
	// sanitize extension (keep alphanumerics only)
	const safeExt = originalExt.replace(/[^a-zA-Z0-9]/g, '') || ext

	// generate or validate filename
	let filename: string
	if (typeof fileNameOrIdLength === 'number') {
		filename = `${generateRandomId(fileNameOrIdLength)}.${safeExt}`
	} else {
		ensureSafeBasename(fileNameOrIdLength)
		filename = `${fileNameOrIdLength}.${safeExt}`
	}

	// normalize and validate filelocation
	const normalizedFilelocation = normalizeRelative(filelocation)

	// ensure directory exists and is within mount
	const dirPath = await resolveAndEnsureInside(location, normalizedFilelocation)
	await mkdir(dirPath, { recursive: true })

	// ensure target file will be inside mount (prevents traversal & symlink escape)
	const targetPath = await resolveAndEnsureInside(location, normalizedFilelocation, filename)

	await writeFile(targetPath, binaryString as any, {
		flag: 'w',
	})

	return filename
}

/**
 * @description Get file path in the specified directory
 * @param filename provide the file name (return of storeFileLocally)
 * @param filelocation provide the folder you wish to locate the file in
 * @returns file path: `${config.fileStorage.mount}/${filelocation}/${filename}`
 */
export const getFileLocally = (filename: string, filelocation: string = ''): string => {
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')
	ensureSafeBasename(filename)
	const normalizedFilelocation = normalizeRelative(filelocation)
	// resolve synchronously enough for simple paths: use path.resolve and ensure inside mount
	const resolved = path.resolve(location, normalizedFilelocation, filename)
	// simple check: ensure resolved path starts with mount resolved
	const mountResolved = path.resolve(location)
	const relative = path.relative(mountResolved, resolved)
	if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..')) {
		return resolved
	}
	throw createError({
		statusCode: 400,
		statusMessage: 'Resolved path is outside of configured mount',
	})
}

/**
 * @description Get all files in the specified directory
 * @param filelocation provide the folder you wish to locate the file in
 * @returns all files in filelocation: `${config.fileStorage.mount}/${filelocation}`
 */
export const getFilesLocally = async (filelocation: string = ''): Promise<string[]> => {
	const location = getMount()
	if (!location) return []
	const normalizedFilelocation = normalizeRelative(filelocation)
	const dirPath = await resolveAndEnsureInside(location, normalizedFilelocation)
	return await readdir(dirPath).catch(() => [])
}

/**
 * @param filename the name of the file you want to delete
 * @param filelocation the folder where the file is located, if it is in the root folder you can leave it empty, if it is in a subfolder you can pass the name of the subfolder with a preceding slash: `/subfolder`
 * @example
 * ```ts
 * await deleteFile('/userFiles', 'requiredFile.txt')
 * ```
 */
export const deleteFile = async (filename: string, filelocation: string = '') => {
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')
	ensureSafeBasename(filename)
	const normalizedFilelocation = normalizeRelative(filelocation)
	const targetPath = await resolveAndEnsureInside(location, normalizedFilelocation, filename)
	await rm(targetPath)
}

/**
 * @description generates a random ID with the specified length
 * @param length the length of the random ID
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
 * @description Parses a data URL and returns an object with the binary data and the file extension.
 * @param {string} file - The data URL
 * @returns {{binaryString: Buffer, ext: string}} An object with the binary data - file extension
 *
 * @example
 * ```ts
 *   const { binaryString, ext } = parseDataUrl(file.content)
 * ```
 */
export const parseDataUrl = (file: string): { binaryString: Buffer; ext: string } => {
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
 * Retrieve a file as a readable stream from local storage
 * @param event H3 event to set response headers
 * @param filename name of the file to retrieve
 * @param filelocation folder where the file is located
 * @returns Readable stream of the file
 */
export const retrieveFileLocally = async (
	event: H3Event<EventHandlerRequest>,
	filename: string,
	filelocation: string = '',
): Promise<NodeJS.ReadableStream> => {
	// Ensure the file exists and is a regular file
	const filePath = getFileLocally(filename, filelocation)
	let stats
	try {
		stats = await fsPromises.stat(filePath)
		if (!stats.isFile()) {
			throw createError({ statusCode: 404, statusMessage: 'Not Found' })
		}
	} catch (err) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}

	// Basic mime mapping for common types, fallback to octet-stream
	const ext = path.extname(filePath).slice(1).toLowerCase()
	const mimeMap: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		pdf: 'application/pdf',
		txt: 'text/plain',
		html: 'text/html',
		json: 'application/json',
	}
	const contentType = mimeMap[ext] || 'application/octet-stream'

	// Set headers and return a readable stream (Nitro/h3 will handle streaming)
	event.node.res.setHeader('Content-Type', contentType)
	event.node.res.setHeader('Content-Length', String(stats.size))
	// suggest inline disposition so browsers can display known types
	event.node.res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`)

	return createReadStream(filePath)
}
