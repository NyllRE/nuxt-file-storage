import {
	defineNuxtModule,
	createResolver,
	addImportsDir,
	addServerScanDir,
	logger,
} from '@nuxt/kit'
import { $fetch } from 'ofetch'
import defu from 'defu'
import { version } from '../package.json'

//? Module options TypeScript interface definition
export interface ModuleOptions {
	mount: string
	version: string
}

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

		if (nuxt.options.dev) {
			$fetch('https://registry.npmjs.org/nuxt-file-storage/latest')
				.then((release: any) => {
					if (release.version > version)
						logger.info(
							`A new version of Nuxt File Storage (v${release.version}) is available: https://github.com/nyllre/nuxt-file-storage/releases/latest`,
						)
				})
				.catch(() => {})

			if (!config.public.fileStorage.version) {
				config.public.fileStorage = defu(config.public.fileStorage, {
					version: '0.0.0',
				})
			}

			//? Check for updates and alert users of new features
			//! I couldn't find a way to detect new updates to warn one time so it will warn every time the server runs again, if you know how to warn about a breaking change only the first run after an update feel free to open a new pull request
			const previousVersion = config.public.fileStorage?.version
			if (!previousVersion || previousVersion !== version) {
				// logger.info(`🎉 Nuxt File Storage updated to version ${version}! 🎉`)
				logger.warn(
					`There is a breaking change in the \`fileStoreLocally\` method, link to changelog:\nhttps://github.com/NyllRE/nuxt-file-storage/releases/tag/v${version}\n`,
				)
				// Store the current version in the runtime config
				config.public.fileStorage.version = version
			}
		}

		const resolve = createResolver(import.meta.url).resolve

		addImportsDir(resolve('runtime/composables'))
		addServerScanDir(resolve('./runtime/server'))
	},
})
