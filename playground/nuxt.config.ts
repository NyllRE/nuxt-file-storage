export default defineNuxtConfig({
	modules: ['../src/module'],
	storage: {
		location: 'playground/public/userFiles',
	},
	devtools: { enabled: true },
})
