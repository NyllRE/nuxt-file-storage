import { defineNuxtModule, createResolver, addImportsDir, addServerScanDir } from '@nuxt/kit'
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
	//! no defaults for now
	// defaults: {
	// 	mount: 'userFiles',
	// },
	setup(options, nuxt) {
		const config = nuxt.options.runtimeConfig as any
		config.public.fileStorage = defu(config.public.fileStorage, {
			...options,
		})
		const resolve = createResolver(import.meta.url).resolve

		addImportsDir(resolve('runtime/composables'))
		addServerScanDir(resolve('./runtime/server'))
	},
})
