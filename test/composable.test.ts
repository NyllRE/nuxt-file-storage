import { describe, it, expect } from 'vitest'
import useFileStorage from '../src/runtime/composables/useFileStorage'

describe('useFileStorage composable', () => {
	it('should create an iterable files ref', () => {
		const { files } = useFileStorage()
		
		// files should still work as a ref with .value
		expect(files.value).toEqual([])
		expect(Array.isArray(files.value)).toBe(true)
	})

	it('should allow iteration without .value when exposed via defineExpose', () => {
		const { files } = useFileStorage()
		
		// Simulate adding files
		files.value.push({
			name: 'test.txt',
			size: 100,
			type: 'text/plain',
			lastModified: Date.now(),
			content: 'data:text/plain;base64,dGVzdA=='
		} as any)
		
		// Test that files is iterable directly (without .value)
		const fileNames: string[] = []
		for (const file of files as any) {
			fileNames.push(file.name)
		}
		
		expect(fileNames).toEqual(['test.txt'])
	})

	it('should maintain backward compatibility with .value access', () => {
		const { files } = useFileStorage()
		
		files.value.push({
			name: 'test1.txt',
			size: 100,
			type: 'text/plain',
			lastModified: Date.now(),
			content: 'data:text/plain;base64,dGVzdA=='
		} as any)
		
		files.value.push({
			name: 'test2.txt',
			size: 200,
			type: 'text/plain',
			lastModified: Date.now(),
			content: 'data:text/plain;base64,dGVzdA=='
		} as any)
		
		// Traditional .value iteration should still work
		const fileNames: string[] = []
		for (const file of files.value) {
			fileNames.push(file.name)
		}
		
		expect(fileNames).toEqual(['test1.txt', 'test2.txt'])
		expect(files.value.length).toBe(2)
	})
})
