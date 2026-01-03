import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'fs/promises'
import {
	normalizeRelative,
	isSafeBasename,
	ensureSafeBasename,
	containsPathTraversal,
	resolveAndEnsureInside,
} from '../src/runtime/server/utils/path-safety.js'

let tmpRoot = ''

beforeEach(async () => {
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'nfs-test-'))
})

afterEach(async () => {
	if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
})

describe('path-safety helpers', () => {
	it('normalizeRelative removes leading slashes and backslashes', () => {
		expect(normalizeRelative('/foo/bar')).toBe('foo/bar')
		expect(normalizeRelative('\\foo\\bar')).toBe('foo/bar')
	})

	it('isSafeBasename and ensureSafeBasename allow good names and reject bad ones', () => {
		expect(isSafeBasename('file.txt')).toBe(true)
		expect(() => ensureSafeBasename('file.txt')).not.toThrow()

		expect(isSafeBasename('../etc/passwd')).toBe(false)
		expect(isSafeBasename('subdir/file')).toBe(false)
		expect(isSafeBasename('')).toBe(false)
		expect(() => ensureSafeBasename('../escape')).toThrow()
	})

	it('containsPathTraversal detects .. segments', () => {
		expect(containsPathTraversal('../etc/passwd')).toBe(true)
		expect(containsPathTraversal('/safe/path')).toBe(false)
		expect(containsPathTraversal('some/../thing')).toBe(true)
	})

	it('resolveAndEnsureInside allows normal paths inside mount', async () => {
		const mount = path.join(tmpRoot, 'mount')
		await mkdir(mount, { recursive: true })
		const target = await resolveAndEnsureInside(mount, 'sub', 'file.txt')
		expect(target.startsWith(mount)).toBe(true)
	})

	it('resolveAndEnsureInside rejects traversal attempts', async () => {
		const mount = path.join(tmpRoot, 'mount2')
		await mkdir(mount, { recursive: true })
		await expect(resolveAndEnsureInside(mount, '..', 'etc', 'passwd')).rejects.toThrow()
	})

	it('resolveAndEnsureInside detects symlink escapes', async () => {
		// create external dir outside mount
		const external = path.join(tmpRoot, 'external')
		await mkdir(external, { recursive: true })
		await writeFile(path.join(external, 'outside.txt'), 'ok')

		const mount = path.join(tmpRoot, 'mount3')
		const inner = path.join(mount, 'inner')
		await mkdir(inner, { recursive: true })

		// create symlink inside mount -> external
		await symlink(external, path.join(inner, 'escape'))

		// attempt to resolve a path that goes through the symlink
		await expect(
			resolveAndEnsureInside(mount, 'inner', 'escape', 'outside.txt'),
		).rejects.toThrow()
	})
})
