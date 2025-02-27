export default defineNuxtConfig({
	modules: ['../src/module'],

	fileStorage: {
		mount: process.env.mount,
	},

	devtools: { enabled: true },
	compatibilityDate: '2025-02-27',
})
