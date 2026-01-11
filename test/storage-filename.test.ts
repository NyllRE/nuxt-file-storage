import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import os from 'os'
import path from 'path'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'fs/promises'

let tmpRoot = ''
let mountDir = ''
let mockMount = ''

vi.mock('#imports', () => ({
	useRuntimeConfig: () => ({ public: { fileStorage: { mount: mockMount } } }),
}))

import { storeFileLocally } from '../src/runtime/server/utils/storage'

beforeEach(async () => {
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'nfs-filename-test-'))
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

const pngDataUrl =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const txtDataUrl = 'data:text/plain;base64,aGVsbG8gd29ybGQK'

describe('filename handling', () => {
	describe('when fileNameOrIdLength is a number', () => {
		it('generates a random ID with the correct extension from original filename', async () => {
			const file = { name: 'photo.png', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 8, '')
			expect(filename).toMatch(/^[A-Za-z0-9]{8}\.png$/)
		})

		it('generates a random ID with extension from MIME type when filename has no extension', async () => {
			const file = { name: 'photo', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 10, '')
			expect(filename).toMatch(/^[A-Za-z0-9]{10}\.png$/)
		})
	})

	describe('when fileNameOrIdLength is a string', () => {
		it('appends the correct extension when filename has no extension', async () => {
			const file = { name: 'image.png', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 'myPhoto', '')
			expect(filename).toBe('myPhoto.png')
		})

		it('uses filename as-is when extension matches', async () => {
			const file = { name: 'image.png', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 'myPhoto.png', '')
			expect(filename).toBe('myPhoto.png')
		})

		it('replaces wrong extension with correct one and warns', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const file = { name: 'image.png', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 'myPhoto.txt', '')
			expect(filename).toBe('myPhoto.png')
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('does not have the expected extension'),
			)
			warnSpy.mockRestore()
		})

		it('handles filenames with multiple dots correctly (wrong extension)', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const file = { name: 'image.png', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 'my.file.name.txt', '')
			expect(filename).toBe('my.file.name.png')
			expect(warnSpy).toHaveBeenCalled()
			warnSpy.mockRestore()
		})

		it('handles filenames with multiple dots correctly (correct extension)', async () => {
			const file = { name: 'image.png', content: pngDataUrl }
			const filename = await storeFileLocally(file as any, 'my.file.name.png', '')
			expect(filename).toBe('my.file.name.png')
		})
	})

	describe('file overwriting', () => {
		it('overwrites existing file with same name', async () => {
			const file1 = { name: 'doc.txt', content: txtDataUrl }
			const file2 = { name: 'doc.txt', content: 'data:text/plain;base64,bmV3IGNvbnRlbnQK' } // 'new content\n'

			const filename1 = await storeFileLocally(file1 as any, 'same', 'folder')
			const filename2 = await storeFileLocally(file2 as any, 'same', 'folder')

			expect(filename1).toBe(filename2)

			const content = await readFile(path.join(mountDir, 'folder', filename2), 'utf-8')
			expect(content).toBe('new content\n')
		})
	})
})

describe('mkdir error handling', () => {
	it('throws descriptive error when a file exists where directory should be (ENOTDIR)', async () => {
		// Create a file at 'blocker' path
		await writeFile(path.join(mountDir, 'blocker'), 'I am a file')

		const file = { name: 'test.txt', content: txtDataUrl }
		// Try to create a file in 'blocker/subfolder' - should fail because 'blocker' is a file
		await expect(storeFileLocally(file as any, 'test', 'blocker/subfolder')).rejects.toThrow(
			/ENOTDIR/,
		)
	})

	it('throws descriptive error when a file exists at exact directory path (EEXIST)', async () => {
		// Create a file at 'profile' path (not a directory)
		await writeFile(path.join(mountDir, 'profile'), 'I am a file blocking the directory')

		const file = { name: 'test.txt', content: txtDataUrl }
		// Try to store in 'profile' folder - should fail because 'profile' is a file
		await expect(storeFileLocally(file as any, 'user123', 'profile')).rejects.toThrow(
			/EEXIST|ENOTDIR/,
		)
	})

	it('successfully creates nested directories when path is clear', async () => {
		const file = { name: 'test.txt', content: txtDataUrl }
		const filename = await storeFileLocally(file as any, 'deep', 'a/b/c/d')
		expect(filename).toBe('deep.txt')

		const content = await readFile(path.join(mountDir, 'a/b/c/d', filename), 'utf-8')
		expect(content).toContain('hello world')
	})

	it('succeeds when directory already exists', async () => {
		// Pre-create the directory
		await mkdir(path.join(mountDir, 'existing'), { recursive: true })

		const file = { name: 'test.txt', content: txtDataUrl }
		const filename = await storeFileLocally(file as any, 'inExisting', 'existing')
		expect(filename).toBe('inExisting.txt')
	})
})
