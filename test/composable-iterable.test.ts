import { ref } from 'vue'
import { describe, it, expect } from 'vitest'
import useFileStorage from '../src/runtime/composables/useFileStorage'

describe('iterable files ref', () => {
	it('can be iterated directly via Symbol.iterator', () => {
		const { files } = useFileStorage()

		files.value.push({
			name: 'a.txt',
			size: 10,
			type: 'text/plain',
			lastModified: 1,
			content: 'data:text/plain;base64,YQ==',
		} as any)
		files.value.push({
			name: 'b.txt',
			size: 20,
			type: 'text/plain',
			lastModified: 2,
			content: 'data:text/plain;base64,Yg==',
		} as any)

		const names: string[] = []
		for (const file of files as any) {
			names.push(file.name)
		}

		expect(names).toEqual(['a.txt', 'b.txt'])
	})

	it('still works with .value access (backward compat)', () => {
		const { files } = useFileStorage()

		files.value.push({
			name: 'x.txt',
			size: 5,
			type: 'text/plain',
			lastModified: 0,
			content: 'data:text/plain;base64,eA==',
		} as any)

		expect(files.value).toHaveLength(1)
		expect(files.value[0].name).toBe('x.txt')
	})

	it('clearFiles clears the files ref', () => {
		const { files, clearFiles } = useFileStorage()

		files.value.push({} as any)
		expect(files.value).toHaveLength(1)

		clearFiles()
		expect(files.value).toHaveLength(0)
	})

	it('clearFiles resets the HTML file input value via ref', () => {
		const { clearFiles } = useFileStorage()
		const input = document.createElement('input')
		input.type = 'file'

		const dataTransfer = new DataTransfer()
		dataTransfer.items.add(new File(['a'], 'a.txt'))
		input.files = dataTransfer.files

		const inputRef = ref<HTMLInputElement | null>(input)
		clearFiles(inputRef)
		expect(input.value).toBe('')
	})

	it('can be spread into an array', () => {
		const { files } = useFileStorage()

		files.value.push({
			name: 's.txt',
			size: 1,
			type: 'text/plain',
			lastModified: 0,
			content: 'data:text/plain;base64,cw==',
		} as any)

		const arr = [...(files as any)]
		expect(arr).toHaveLength(1)
		expect(arr[0].name).toBe('s.txt')
	})

	it('handleFileInput still populates files', async () => {
		const { files, handleFileInput } = useFileStorage()

		const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
		const event = { target: { files: [file] } }
		await handleFileInput(event)

		expect(files.value).toHaveLength(1)
		expect(files.value[0].name).toBe('hello.txt')
	})
})
