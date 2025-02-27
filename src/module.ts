import {
	defineNuxtModule,
	createResolver,
	addImportsDir,
	addServerScanDir,
	logger,
} from '@nuxt/kit'
// import { $fetch } from 'ofetch'
import defu from 'defu'
// import { version } from '../package.json'

import type { ModuleOptions } from './types'
export type * from './types'

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: 'nuxt-file-storage',
		configKey: 'fileStorage',
	},
	//? Default configuration options of the Nuxt module
	//! no defaults for now
	// defaults: {
	// 	version: '0.0.0',
	// },
	setup(options, nuxt) {
		const config = nuxt.options.runtimeConfig as any
		config.public.fileStorage = defu(config.public.fileStorage, {
			...options,
		})

		if (!config.public.fileStorage.mount) {
			logger.error(
				'Please provide a mount path for the file storage module in your nuxt.config.js',
			)
		} else {
			logger.ready(
				`Nuxt File Storage has mounted successfully`,
			)
		}

		// if (nuxt.options.dev) {
		// 	// $fetch('https://registry.npmjs.org/nuxt-file-storage/latest')
		// 	// 	.then((release: any) => {
		// 	// 		if (release.version > version)
		// 	// 			logger.info(
		// 	// 				`A new version of Nuxt File Storage (v${release.version}) is available: https://github.com/nyllre/nuxt-file-storage/releases/latest`,
		// 	// 			)
		// 	// 	})
		// 	// 	.catch(() => {})
		// }

		const resolve = createResolver(import.meta.url).resolve

		addImportsDir(resolve('runtime/composables'))
		addServerScanDir(resolve('./runtime/server'))
	},
})
