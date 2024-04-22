export default defineNuxtConfig({
	modules: ['../src/module'],
	fileStorage: {
		mount: process.env.mount,
	},
	devtools: { enabled: true },
})
