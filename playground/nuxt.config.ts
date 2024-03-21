export default defineNuxtConfig({
	modules: ['../src/module'],
	nitroStorage: {
		mount: process.env.mount,
	},
	devtools: { enabled: true },
})
