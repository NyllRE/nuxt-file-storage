import { defineNuxtModule, createResolver, addImportsDir } from "@nuxt/kit";

// Module options TypeScript interface definition
export interface ModuleOptions {
	location: string
}

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: 'nuxt-backend-storage',
		configKey: 'storage',
	},
	// Default configuration options of the Nuxt module
	defaults: {
		location: 'public/userFiles',
	},
	setup(options, nuxt) {
		nuxt.options.runtimeConfig.public.nuxtStorage = options
		// @ts-expect-error
		const resolver = createResolver(import.meta.url)

		addImportsDir(resolver.resolve('runtime/composables'))
		addImportsDir(resolver.resolve('runtime/server/utils'))
	},
})
