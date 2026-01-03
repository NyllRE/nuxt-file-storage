import path from 'path'
import { realpath, stat } from 'fs/promises'
import { createError } from '#imports'

export const normalizeRelative = (p: string): string => {
	if (!p) return ''
	// Remove leading slashes/backslashes and normalize separators
	return p.replace(/^[/\\]+/, '').replace(/\\/g, '/')
}

export const isSafeBasename = (name: string): boolean => {
	if (!name) return false
	// Must be the basename, not contain slashes, no null bytes, and not '.' or '..'
	if (name !== path.basename(name)) return false
	if (name.includes('\0')) return false
	if (name === '.' || name === '..') return false
	if (name.includes('/') || name.includes('\\')) return false
	// Prevent any traversal tokens
	if (name.split(/[/\\]+/).includes('..')) return false
	return true
}

export const ensureSafeBasename = (name: string): string => {
	if (!isSafeBasename(name)) throw new Error('Unsafe filename')
	return name
}

export const containsPathTraversal = (p: string): boolean => {
	if (!p) return false
	// detect any '..' path segment in the original string (defensive) or after normalization
	if (/^([\\/]|^)?\.\.([\\/]|$)?/.test(p) || /(^|[\\/])\.\.($|[\\/])/.test(p)) return true
	const normalized = path.normalize(p)
	const parts = normalized.split(/[/\\]+/)
	return parts.includes('..')
}

/**
 * Resolve a target path relative to a mount and ensure it cannot escape the mount.
 * Throws on any suspicious input (path traversal, symlink escape, absolute outside mount).
 */
export const resolveAndEnsureInside = async (
	mount: string,
	...parts: string[]
): Promise<string> => {
	if (!mount) throw new Error('Mount path must be provided')
	const mountResolved = path.resolve(mount)
	// strip leading separators from parts to avoid absolute components
	const cleanedParts = parts.map((p) => p.replace(/^[/\\]+/, ''))
	const targetResolved = path.resolve(mountResolved, ...cleanedParts)

	// Quick check: ensure target is within mount using path.relative
	const relative = path.relative(mountResolved, targetResolved)
	if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..')) {
		// Check for symlink escapes by resolving the nearest existing parent
		let cur = targetResolved
		while (cur) {
			try {
				await stat(cur)
				break
			} catch (error) {
				const parent = path.dirname(cur)
				if (parent === cur) break
				cur = parent
			}
		}

		const mountReal = await realpath(mountResolved)
		const curReal = await realpath(cur)
		if (!curReal.startsWith(mountReal)) {
			throw new Error('Resolved path escapes configured mount (symlink detected)')
		}

		return targetResolved
	}
	throw createError({
		statusCode: 400,
		statusMessage: 'Resolved path is outside of configured mount',
	})
}
