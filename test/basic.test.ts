import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
	await setup({
		rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
	})

	it('renders the index page', async () => {
		// Get response to a server-rendered page with `$fetch`.
		const html = await $fetch('/')
		expect(html).toContain('<input type="file" multiple>')
	})
})

//! Look into this: https://runthatline.com/how-to-mock-fetch-api-with-vitest/
// describe('Server API', async () => {
// 	await setup({
// 		rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
// 	})

// 	it('sends a file to the server', async () => {
// 		const fileName = await fetch('/api/files', {
// 			method: 'POST',
// 			body: JSON.stringify({
// 				files: [
// 					{
// 						name: 'ExampleFile',
// 						content: 'data:text/plain;base64,dGhpcyBpcyBhbiBleGFtcGxlIGZpbGUK',
// 					},
// 				],
// 			}),
// 		})
// 		console.log(`API Request Result: ${fileName}`)

// 		expect(fileName).toContain('ExampleFile')
// 	})
// })
