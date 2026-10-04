import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import os from 'os'
import path from 'path'
import type { H3Event } from 'h3'
import { mkdtemp, rm, readFile, writeFile, mkdir, symlink } from 'fs/promises'

let tmpRoot = ''
let mountDir = ''
let mockMount = ''

vi.mock('#imports', () => ({
	useRuntimeConfig: () => ({ public: { fileStorage: { mount: mockMount } } }),
}))

import {
	storeFileLocally,
	storeFile,
	storeFileJson,
	getFileLocally,
	getFilesLocally,
	deleteFile,
	retrieveFileLocally,
} from '../src/runtime/server/utils/storage'

beforeEach(async () => {
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'nfs-test-'))
	mountDir = path.join(tmpRoot, 'mount')
	await mkdir(mountDir, { recursive: true })
	mockMount = mountDir
	process.env.FILE_STORAGE_MOUNT = mountDir
})

afterEach(async () => {
	if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
	mockMount = ''
	delete process.env.FILE_STORAGE_MOUNT
})

const createMockEvent = (): H3Event =>
	({
		node: {
			res: {
				setHeader: vi.fn(),
			},
		},
	} as unknown as H3Event)

const dataUrl = 'data:text/plain;base64,aGVsbG8gd29ybGQK' // 'hello world\n'

// ─── storeFileJson (JSON / base64 method) ────────────────────────────────────

describe('storeFileJson', () => {
	it('stores a file from base64 data URL', async () => {
		const file = { name: 'test.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		const filename = await storeFileJson(file, 8, 'sub')
		expect(filename).toMatch(/^[A-Za-z0-9]{8}\.txt$/)
		const filePath = getFileLocally(filename, 'sub')
		const content = await readFile(filePath, 'utf-8')
		expect(content).toContain('hello world')
	})

	it('rejects unsafe filename values', async () => {
		const file = { name: 'test.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		await expect(storeFileJson(file, 'bad/name', 'sub')).rejects.toThrow()
	})

	it('rejects traversal in filelocation', async () => {
		const file = { name: 'a.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		await expect(storeFileJson(file, 6, '../etc')).rejects.toThrow()
	})

	it('rejects when given an invalid data URL', async () => {
		const invalidFile = {
			name: 'invalid.txt',
			content: 'not-a-data-url',
			size: 12,
			type: 'text/plain',
			lastModified: Date.now(),
		}
		await expect(storeFileJson(invalidFile, 8, 'sub')).rejects.toThrow(/invalid data url/i)
	})
})

// ─── storeFile (multipart method) ────────────────────────────────────────────

describe('storeFile', () => {
	it('stores a file from raw Uint8Array without base64 conversion', async () => {
		const rawContent = new TextEncoder().encode('hello from multipart\n')
		const entry = {
			name: 'files',
			filename: 'hello.txt',
			type: 'text/plain',
			data: rawContent,
		}

		const filename = await storeFile(entry, 'greeting', '/uploads')
		expect(filename).toBe('greeting.txt')

		const filePath = getFileLocally(filename, '/uploads')
		const content = await readFile(filePath, 'utf-8')
		expect(content).toBe('hello from multipart\n')
	})

	it('generates a random ID when given a number', async () => {
		const entry = {
			name: 'files',
			filename: 'report.pdf',
			type: 'application/pdf',
			data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
		}

		const filename = await storeFile(entry, 12, '')
		expect(filename).toMatch(/^[A-Za-z0-9]{12}\.pdf$/)
	})

	it('rejects unsafe filenames', async () => {
		const entry = {
			name: 'files',
			filename: 'safe.txt',
			type: 'text/plain',
			data: new Uint8Array([0x68, 0x69]),
		}

		await expect(storeFile(entry, 'bad/name', '')).rejects.toThrow()
	})

	it('rejects traversal in filelocation', async () => {
		const entry = {
			name: 'files',
			filename: 'a.txt',
			type: 'text/plain',
			data: new Uint8Array([0x61]),
		}

		await expect(storeFile(entry, 6, '../etc')).rejects.toThrow()
	})

	it('preserves binary data integrity (no base64 round-trip)', async () => {
		const binaryData = new Uint8Array(256)
		for (let i = 0; i < 256; i++) {
			binaryData[i] = i
		}

		const entry = {
			name: 'files',
			filename: 'binary.bin',
			type: 'application/octet-stream',
			data: binaryData,
		}

		const filename = await storeFile(entry, 'allbytes', '')
		const filePath = getFileLocally(filename, '')
		const readBack = await readFile(filePath)

		expect(readBack.length).toBe(256)
		for (let i = 0; i < 256; i++) {
			expect(readBack[i]).toBe(i)
		}
	})

	it('normalizes mismatched filename extension based on content type', async () => {
		// Simulate a multipart file where the original filename has .jpg
		// but the content-type is image/png. When the user provides a
		// custom filename with a *different* extension, it should be
		// corrected to match the source file's extension.
		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
		const entry = {
			name: 'files',
			filename: 'photo.jpg',
			type: 'image/png',
			data: pngHeader,
		}

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		// User provides 'photo.txt' — extension should be corrected to .jpg
		const storedFilename = await storeFile(entry, 'photo.txt', '/uploads')

		expect(storedFilename).toBe('photo.jpg')
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('does not have the expected extension'),
		)

		warnSpy.mockRestore()
	})
})

// ─── storeFileLocally (legacy alias) ─────────────────────────────────────────

describe('storeFileLocally (legacy alias)', () => {
	it('dispatches to storeFile for multipart entries', async () => {
		const entry = {
			name: 'files',
			filename: 'alias.txt',
			type: 'text/plain',
			data: new TextEncoder().encode('via alias\n'),
		}

		const filename = await storeFileLocally(entry, 'aliased', '')
		expect(filename).toBe('aliased.txt')

		const filePath = getFileLocally(filename, '')
		const content = await readFile(filePath, 'utf-8')
		expect(content).toBe('via alias\n')
	})

	it('dispatches to storeFileJson for base64 entries', async () => {
		const file = { name: 'alias2.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		const filename = await storeFileLocally(file, 8, '')
		expect(filename).toMatch(/^[A-Za-z0-9]{8}\.txt$/)
	})

	it('rejects unsafe filename values', async () => {
		const file = { name: 'test.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		await expect(storeFileLocally(file, 'bad/name', 'sub')).rejects.toThrow()
	})

	it('rejects traversal in filelocation', async () => {
		const file = { name: 'a.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		await expect(storeFileLocally(file, 6, '../etc')).rejects.toThrow()
	})

	it('writing through a symlink that points outside the mount is blocked', async () => {
		const external = path.join(tmpRoot, 'external')
		await mkdir(external, { recursive: true })
		await writeFile(path.join(external, 'outside.txt'), 'ok')

		const inner = path.join(mountDir, 'inner')
		await mkdir(inner, { recursive: true })
		await symlink(external, path.join(inner, 'escape'))

		const file = { name: 's.txt', content: dataUrl, size: 12, type: 'text/plain', lastModified: Date.now() }
		await expect(storeFileLocally(file, 'safename', 'inner/escape')).rejects.toThrow()
	})
})

// ─── file retrieval & deletion ───────────────────────────────────────────────

describe('file retrieval functions', () => {
	it('getFilesLocally lists saved files', async () => {
		const entry = {
			name: 'files',
			filename: 'list.txt',
			type: 'text/plain',
			data: new TextEncoder().encode('list me'),
		}
		const name = await storeFile(entry, 'list', 'folder')
		const files = await getFilesLocally('folder')
		expect(files.includes(name)).toBe(true)
	})

	it('creates and retrieves a file through retrieveFileLocally', async () => {
		const entry = {
			name: 'files',
			filename: 'getme.txt',
			type: 'text/plain',
			data: new TextEncoder().encode('hello world\n'),
		}
		const filename = await storeFile(entry, 'getme', 'specificFolder')

		const mockEvent = createMockEvent()
		const stream = await retrieveFileLocally(mockEvent, filename, 'specificFolder')
		let data = ''
		for await (const chunk of stream) {
			data += chunk.toString()
		}
		expect(data).toBe('hello world\n')
	})

	it('deleteFile removes a file and rejects outside deletions', async () => {
		const entry = {
			name: 'files',
			filename: 'del.txt',
			type: 'text/plain',
			data: new TextEncoder().encode('delete me'),
		}
		const name = await storeFile(entry, 'del', '')
		const fp = getFileLocally(name, '')
		await deleteFile(name, '')
		await expect(readFile(fp, 'utf-8')).rejects.toThrow()

		await expect(deleteFile('../etc/passwd', '')).rejects.toThrow()
	})
})
