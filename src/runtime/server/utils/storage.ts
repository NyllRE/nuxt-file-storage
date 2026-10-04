import { writeFile, rm, mkdir, readdir } from 'fs/promises'
import type { ServerFile, File, MultipartFileEntry } from '../../types'
import type { H3Event, EventHandlerRequest } from 'h3'
import path from 'path'
import {
	normalizeRelative,
	ensureSafeBasename,
	resolveAndEnsureInside,
} from './path-safety'
import { createError, useRuntimeConfig } from '#imports'
import { createReadStream, promises as fsPromises } from 'fs'

const getMount = (): string | undefined => {
	try {
		return useRuntimeConfig().public.fileStorage.mount
	} catch {
		return process.env.FILE_STORAGE_MOUNT || process.env.NUXT_FILE_STORAGE_MOUNT
	}
}

/**
 * @description Shared helper to write binary data to the filesystem after validating the path.
 */
const writeToFileSystem = async (
	binaryData: Buffer,
	fileNameOrIdLength: string | number,
	filelocation: string,
	originalFileName: string,
	originalExt: string,
): Promise<string> => {
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')

	const safeExt = originalExt.replace(/[^a-zA-Z0-9]/g, '') || originalExt

	let filename: string
	if (typeof fileNameOrIdLength === 'number') {
		filename = `${generateRandomId(fileNameOrIdLength)}.${safeExt}`
	} else {
		ensureSafeBasename(fileNameOrIdLength)
		const extensionFromFileName = fileNameOrIdLength.split('.').pop()

		if (!fileNameOrIdLength.includes('.')) {
			filename = `${fileNameOrIdLength}.${safeExt}`
		} else if (extensionFromFileName === safeExt) {
			filename = fileNameOrIdLength
		} else {
			console.warn(
				`[nuxt-file-storage] The provided filename "${fileNameOrIdLength}" does not have the expected extension ".${safeExt}". The correct extension will be appended.`,
			)
			filename = `${fileNameOrIdLength.split('.').slice(0, -1).join('.')}.${safeExt}`
		}
	}

	const normalizedFilelocation = normalizeRelative(filelocation)
	const dirPath = await resolveAndEnsureInside(location, normalizedFilelocation)
	try {
		await mkdir(dirPath, { recursive: true })
	} catch (err: any) {
		if (err?.code === 'EEXIST') {
			throw new Error(
				`[nuxt-file-storage] EEXIST: A file already exists at "${dirPath}" where a directory was expected. ` +
					`This typically happens when a file was accidentally created at a path meant for a folder. ` +
					`Please remove or rename the conflicting file.`,
			)
		} else if (err?.code === 'ENOTDIR') {
			throw new Error(
				`[nuxt-file-storage] ENOTDIR: Cannot create directory "${dirPath}" because a parent path component is a file, not a directory. ` +
					`Check if any part of the path "${normalizedFilelocation}" exists as a file instead of a folder. ` +
					`Please remove or rename the conflicting file.`,
			)
		}
		throw err
	}

	const targetPath = await resolveAndEnsureInside(location, normalizedFilelocation, filename)

	await writeFile(targetPath, binaryData as any, {
		flag: 'w',
	})

	return filename
}

/**
 * @description Store a file from a multipart form upload.
 * @param file the multipart file entry (from readMultipartFormData)
 * @param fileNameOrIdLength string = custom name, number = random ID length
 * @param filelocation the folder to store the file in
 * @returns the stored file name
 */
export const storeFile = async (
	file: MultipartFileEntry,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const ext = file.filename.includes('.') ? (file.filename.split('.').pop() as string) : ''
	return writeToFileSystem(
		file.data,
		fileNameOrIdLength,
		filelocation,
		file.filename,
		ext,
	)
}

/**
 * @description Store a file from a JSON body (DataURL mode).
 * @param file the file object (from JSON body)
 * @param fileNameOrIdLength string = custom name, number = random ID length
 * @param filelocation the folder to store the file in
 * @returns the stored file name
 */
export const storeFileJson = async (
	file: File,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const { binaryString, ext } = parseDataUrl(file.content)
	const originalExt = file.name.includes('.') ? (file.name.split('.').pop() as string) : ext
	return writeToFileSystem(
		binaryString,
		fileNameOrIdLength,
		filelocation,
		file.name,
		originalExt || ext,
	)
}

/**
 * @description Store the file in the specified directory
 * @deprecated Use `storeFileJson` instead. Will be removed in v0.5.0.
 */
export const storeFileLocally = async (
	file: ServerFile,
	fileNameOrIdLength: string | number,
	filelocation: string = '',
): Promise<string> => {
	const converted: File = {
		name: file.name,
		size: Number(file.size),
		type: file.type,
		lastModified: Number(file.lastModified),
		content: file.content,
	}
	return storeFileJson(converted, fileNameOrIdLength, filelocation)
}

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

export const getFilesLocally = async (filelocation: string = ''): Promise<string[]> => {
	const location = getMount()
	if (!location) return []
	const normalizedFilelocation = normalizeRelative(filelocation)
	const dirPath = await resolveAndEnsureInside(location, normalizedFilelocation)
	return await readdir(dirPath).catch(() => [])
}

export const deleteFile = async (filename: string, filelocation: string = '') => {
	const location = getMount()
	if (!location) throw new Error('fileStorage.mount is not configured')
	ensureSafeBasename(filename)
	const normalizedFilelocation = normalizeRelative(filelocation)
	const targetPath = await resolveAndEnsureInside(location, normalizedFilelocation, filename)
	await rm(targetPath)
}

const generateRandomId = (length: number) => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let randomId = ''
	for (let i = 0; i < length; i++) {
		randomId += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return randomId
}

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
