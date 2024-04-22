import { defineNuxtModule, createResolver, addImportsDir } from "@nuxt/kit";
import defu from 'defu'

//? Module options TypeScript interface definition
export interface ModuleOptions {
	mount: string
}

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: 'nuxt-file-storage',
		configKey: 'fileStorage',
	},
	//? Default configuration options of the Nuxt module
	// defaults: {
	// },
	setup(options, nuxt) {
		nuxt.options.runtimeConfig.public.fileStorage = defu(
			nuxt.options.runtimeConfig.public.fileStorage,
			{
				...options,
			},
		)
		const resolver = createResolver(import.meta.url)

		addImportsDir(resolver.resolve('runtime/composables'))
		addImportsDir(resolver.resolve('runtime/server/utils'))
	},
})
