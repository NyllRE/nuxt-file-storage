export default defineNuxtConfig({
	modules: ['../src/module', '@nuxt/test-utils/module'],

	fileStorage: {
		mount: process.env.mount,
	},

	devtools: { enabled: true },
	compatibilityDate: '2025-02-27',
})
