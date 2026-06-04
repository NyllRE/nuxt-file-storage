import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
	resolve: {
		alias: {
			'#imports': resolve(__dirname, 'test/__mocks__/imports.ts'),
		},
	},
	test: {
		root: process.cwd(),
		environment: 'happy-dom',
		include: ['test/**/*.test.ts'],
	},
})
