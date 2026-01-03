import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import os from 'os'
import path from 'path'
import { mkdtemp, rm, readFile, writeFile, mkdir, symlink } from 'fs/promises'

let tmpRoot = ''
let mountDir = ''
let mockMount = ''

vi.mock('#imports', () => ({
	useRuntimeConfig: () => ({ public: { fileStorage: { mount: mockMount } } }),
}))

import {
	storeFileLocally,
	getFileLocally,
	getFilesLocally,
	deleteFile,
} from '../src/runtime/server/utils/storage'

beforeEach(async () => {
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'nfs-test-'))
	mountDir = path.join(tmpRoot, 'mount')
	await mkdir(mountDir, { recursive: true })
	mockMount = mountDir
	// make the mount available to storage helpers when Nuxt isn't available
	process.env.FILE_STORAGE_MOUNT = mountDir
})

afterEach(async () => {
	if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
	mockMount = ''
	delete process.env.FILE_STORAGE_MOUNT
})

const dataUrl = 'data:text/plain;base64,aGVsbG8gd29ybGQK' // 'hello world\n'

describe('storage functions', () => {
	it('storeFileLocally stores a file and returns generated filename', async () => {
		const file = { name: 'test.txt', content: dataUrl }
		const filename = await storeFileLocally(file as any, 8, 'sub')
		expect(filename).toMatch(/^[A-Za-z0-9]{8}\.txt$/)
		const filePath = getFileLocally(filename, 'sub')
		const content = await readFile(filePath, 'utf-8')
		expect(content).toContain('hello world')
	})

	it('storeFileLocally rejects unsafe filename values', async () => {
		const file = { name: 'test.txt', content: dataUrl }
		await expect(storeFileLocally(file as any, 'bad/name', 'sub')).rejects.toThrow()
	})

	it('storeFileLocally rejects traversal in filelocation', async () => {
		const file = { name: 'a.txt', content: dataUrl }
		await expect(storeFileLocally(file as any, 6, '../etc')).rejects.toThrow()
	})

	it('getFilesLocally lists saved files', async () => {
		const file = { name: 'list.txt', content: dataUrl }
		const name = await storeFileLocally(file as any, 'list', 'folder')
		const files = await getFilesLocally('folder')
		expect(files.includes(name)).toBe(true)
	})

	it('deleteFile removes a file and rejects outside deletions', async () => {
		const file = { name: 'del.txt', content: dataUrl }
		const name = await storeFileLocally(file as any, 'del', '')
		const fp = getFileLocally(name, '')
		await deleteFile(name, '')
		await expect(readFile(fp, 'utf-8')).rejects.toThrow()

		// Attempt to delete outside mount
		await expect(deleteFile('../etc/passwd', '')).rejects.toThrow()
	})

	it('writing through a symlink that points outside the mount is blocked', async () => {
		const external = path.join(tmpRoot, 'external')
		await mkdir(external, { recursive: true })
		await writeFile(path.join(external, 'outside.txt'), 'ok')

		const inner = path.join(mountDir, 'inner')
		await mkdir(inner, { recursive: true })
		await symlink(external, path.join(inner, 'escape'))

		const file = { name: 's.txt', content: dataUrl }
		await expect(storeFileLocally(file as any, 'safename', 'inner/escape')).rejects.toThrow()
	})
})
