import { writeFile, rm, mkdir, readdir } from 'fs/promises'
import type { JsonFile, ServerFile, MultipartFileEntry } from '../../types'
import type { H3Event, EventHandlerRequest } from 'h3'
import path from 'path'
import {
	normalizeRelative,
	ensureSafeBasename,
	resolveAndEnsureInside,
} from './path-safety'
import { createError, useRuntimeConfig } from '#imports'
import { createReadStream, promises as fsPromises } from 'fs'

// ─── helpers ─────────────────────────────────────────────────────────────────

const getMount = (): string | undefined => {
	try {
		return useRuntimeConfig().public.fileStorage.mount
	} catch {
		return process.env.FILE_STORAGE_MOUNT || process.env.NUXT_FILE_STORAGE_MOUNT
	}
}

/**
 * Parses a data URL and returns the binary buffer + extension.
 * Only works for base64 files (the JSON method).
 */
export const parseDataUrl = (file: string): { binaryString: Buffer; ext: string } => {
	const arr = file.split(',')
	if (arr.length !== 2 || !arr[1]) {
		throw new Error('Invalid data URL: missing base64 payload')
	}
	const mimeMatch = arr[0].match(/:(.*?);/)
	if (!mimeMatch) throw new Error('Invalid data URL: missing MIME type')
	const mime = mimeMatch[1]
	const base64String = arr[1]
	const binaryString = Buffer.from(base64String, 'base64')
	const ext = mime.split('/')[1]
	return { binaryString, ext }
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
 * Resolve the final filename, handling extension logic.
 */
const resolveFilename = (
	sourceName: string,
	fileNameOrIdLength: string | number,
	fallbackExt: string,
): string => {
	const originalExt = sourceName.includes('.')
		? sourceName.split('.').pop()!
		: fallbackExt
	const safeExt = originalExt.replace(/[^a-zA-Z0-9]/g, '') || fallbackExt

	if (typeof fileNameOrIdLength === 'number') {
		return `${generateRandomId(fileNameOrIdLength)}.${safeExt}`
	}

	ensureSafeBasename(fileNameOrIdLength)
	const extensionFromFileName = fileNameOrIdLength.split('.').pop()

	if (!fileNameOrIdLength.includes('.')) {
		return `${fileNameOrIdLength}.${safeExt}`
	}

	if (extensionFromFileName === safeExt) {
		return fileNameOrIdLength
	}

	console.warn(
		`[nuxt-file-storage] The provided filename "${fileNameOrIdLength}" does not have the expected extension ".${safeExt}". The correct extension will be appended.`,
	)
	return `${fileNameOrIdLength.split('.').slice(0, -1).join('.')}.${safeExt}`
}

/**
 * Internal: resolve mount dir, write file, return filename.
 */
const writeToFilesystem = async (
	rawName: string,
	fallbackExt: string,
	buffer: Buffer,
	fileNameOrIdLength: string | number,
	filelocation: string,
): Promise<string> => {
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')

	const filename = resolveFilename(rawName, fileNameOrIdLength, fallbackExt)
	const normalizedFilelocation = normalizeRelative(filelocation)

	const dirPath = await resolveAndEnsureInside(location, normalizedFilelocation)
	try {
		await mkdir(dirPath, { recursive: true })
	} catch (err: any) {
		if (err?.code === 'EEXIST') {
			throw new Error(
				`[nuxt-file-storage] EEXIST: A file already exists at "${dirPath}" where a directory was expected.`,
			)
		} else if (err?.code === 'ENOTDIR') {
			throw new Error(
				`[nuxt-file-storage] ENOTDIR: Cannot create directory "${dirPath}" because a parent path component is a file.`,
			)
		}
		throw err
	}

	const targetPath = await resolveAndEnsureInside(location, normalizedFilelocation, filename)
	await writeFile(targetPath, buffer, { flag: 'w' })

	return filename
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Store a file locally from a **multipart** form entry.
 *
 * Use this when files arrive via `readMultipartFormData()` (recommended).
 *
 * @param file                MultipartFileEntry with raw `data` (Uint8Array)
 * @param fileNameOrIdLength  filename string or random-ID length
 * @param filelocation        subfolder relative to mount
 * @returns                   the stored filename
 *
 * @example
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const files = (await readMultipartFormData(event)) || []
 *   const fileName = await storeFile(files[0], 12, '/userFiles')
 *   return fileName
 * })
 * ```
 */
export const storeFile = async (
	file: MultipartFileEntry,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const buffer = Buffer.from(file.data)
	const fallbackExt = file.type.split('/')[1] || 'bin'
	return writeToFilesystem(file.filename, fallbackExt, buffer, fileNameOrIdLength, filelocation)
}

/**
 * Store a file locally from a **JSON / base64** body.
 *
 * @deprecated Use `storeFile()` with `storageMode: 'Multipart'` instead.
 *
 * @param file                JsonFile object with base64 `content` (data URL)
 * @param fileNameOrIdLength  filename string or random-ID length
 * @param filelocation        subfolder relative to mount
 * @returns                   the stored filename
 *
 * @example
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const { files } = await readBody<{ files: File[] }>(event)
 *   const fileName = await storeFileJson(files[0], 8, '/userFiles')
 *   return fileName
 * })
 * ```
 */
export const storeFileJson = async (
	file: JsonFile,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const { binaryString, ext } = parseDataUrl(file.content)
	return writeToFilesystem(file.name, ext, binaryString, fileNameOrIdLength, filelocation)
}

/**
 * Legacy alias — calls `storeFile` or `storeFileJson` depending on input type.
 *
 * @deprecated Use `storeFile()` or `storeFileJson()` explicitly.
 */
export async function storeFileLocally(
	file: MultipartFileEntry,
	fileNameOrIdLength: string | number,
	filelocation?: string,
): Promise<string>

export async function storeFileLocally(
	file: JsonFile,
	fileNameOrIdLength: string | number,
	filelocation?: string,
): Promise<string>

export async function storeFileLocally(
	file: MultipartFileEntry | File,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> {
	if ('filename' in file && 'data' in file) {
		return storeFile(file as MultipartFileEntry, fileNameOrIdLength, filelocation)
	}
	return storeFileJson(file as JsonFile, fileNameOrIdLength, filelocation)
}

/**
 * Get the absolute path of a locally stored file.
 */
export const getFileLocally = (filename: string, filelocation: string = ''): string => {
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')
	ensureSafeBasename(filename)
	const normalizedFilelocation = normalizeRelative(filelocation)
	const resolved = path.resolve(location, normalizedFilelocation, filename)
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
 * List all files in a local storage directory.
 */
export const getFilesLocally = async (filelocation: string = ''): Promise<string[]> => {
	const location = getMount()
	if (!location) return []
	const normalizedFilelocation = normalizeRelative(filelocation)
	const dirPath = await resolveAndEnsureInside(location, normalizedFilelocation)
	return await readdir(dirPath).catch(() => [])
}

/**
 * Delete a locally stored file.
 *
 * @param filename    the name of the file to delete
 * @param filelocation the folder where the file is located
 *
 * @example
 * ```ts
 * await deleteFile('fileName.png', '/specificFolder')
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
 * Retrieve a file as a readable stream (for serving to clients).
 */
export const retrieveFileLocally = async (
	event: H3Event<EventHandlerRequest>,
	filename: string,
	filelocation: string = '',
): Promise<NodeJS.ReadableStream> => {
	const filePath = getFileLocally(filename, filelocation)
	let stats
	try {
		stats = await fsPromises.stat(filePath)
		if (!stats.isFile()) {
			throw createError({ statusCode: 404, statusMessage: 'Not Found' })
		}
	} catch {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}

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

	event.node.res.setHeader('Content-Type', contentType)
	event.node.res.setHeader('Content-Length', String(stats.size))
	event.node.res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`)

	return createReadStream(filePath)
}
