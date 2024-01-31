import { defineNuxtModule, createResolver, addImportsDir } from "@nuxt/kit";
import defu from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
	location: string
}

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: 'nuxt-nitro-storage',
		configKey: 'storage',
	},
	// Default configuration options of the Nuxt module
	defaults: {
		location: 'public/userFiles',
	},
	setup(options, nuxt) {
		nuxt.options.runtimeConfig.public.nuxtStorage = defu(
			nuxt.options.runtimeConfig.public.nuxtStorage,
			{
				...options,
			},
		)
		const resolver = createResolver(import.meta.url)

		addImportsDir(resolver.resolve('runtime/composables'))
		addImportsDir(resolver.resolve('runtime/server/utils'))
	},
})
