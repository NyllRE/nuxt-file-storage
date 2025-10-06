import { describe, it, expect } from 'vitest'
import useFileStorage from '../src/runtime/composables/useFileStorage'

describe('defineExpose use case - exact scenario from issue', () => {
	it('should allow iteration as shown in the issue comment', () => {
		// Simulate child component
		const { files, handleFileInput, clearFiles } = useFileStorage()
		
		// Simulate defineExpose - in real Vue this would be done automatically
		const childComponentExposed = {
			files,
			handleFileInput,
			clearFiles
		}
		
		// Add some test files
		files.value.push({
			name: 'file1.txt',
			size: 100,
			type: 'text/plain',
			lastModified: Date.now(),
			content: 'data:text/plain;base64,dGVzdDE='
		} as any)
		
		files.value.push({
			name: 'file2.txt',
			size: 200,
			type: 'text/plain',
			lastModified: Date.now(),
			content: 'data:text/plain;base64,dGVzdDI='
		} as any)
		
		// Simulate parent component accessing child via ref
		// In real Vue: const childRef = ref(); childRef.value = childComponentExposed
		const childRef = { value: childComponentExposed }
		
		// THE KEY TEST: This should work WITHOUT .value.value
		// Before fix: for (const file of childRef.value.files.value)
		// After fix: for (const file of childRef.value.files)
		const fileNames: string[] = []
		
		// This is the new, improved syntax that should work
		for (const file of childRef.value.files as any) {
			fileNames.push(file.name)
		}
		
		expect(fileNames).toEqual(['file1.txt', 'file2.txt'])
		expect(fileNames.length).toBe(2)
	})
	
	it('should still support the old .value.value syntax for backward compatibility', () => {
		const { files } = useFileStorage()
		
		files.value.push({
			name: 'test.txt',
			size: 100,
			type: 'text/plain',
			lastModified: Date.now(),
			content: 'data:text/plain;base64,dGVzdA=='
		} as any)
		
		const childComponentExposed = { files }
		const childRef = { value: childComponentExposed }
		
		// Old syntax should still work
		const fileNames: string[] = []
		for (const file of childRef.value.files.value) {
			fileNames.push(file.name)
		}
		
		expect(fileNames).toEqual(['test.txt'])
	})
})
