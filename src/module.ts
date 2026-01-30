import {
	defineNuxtModule,
	createResolver,
	addImportsDir,
	addServerScanDir,
	addTemplate,
	logger,
} from '@nuxt/kit'
// import { $fetch } from 'ofetch'
import { defu } from 'defu'
// import { version } from '../package.json'

export type * from './runtime/types.js'
import type { ModuleOptions } from './runtime/types.js'

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
		const { resolve } = createResolver(import.meta.url)

		const config = nuxt.options.runtimeConfig as any
		config.public.fileStorage = defu(config.public.fileStorage, {
			...options,
		})

		logger.ready(`Nuxt File Storage has mounted successfully`)

		nuxt.options.alias['#file-storage'] = resolve('./runtime')

		addImportsDir(resolve('runtime/composables'))
		addServerScanDir(resolve('./runtime/server'))

		addTemplate({
			filename: 'types/nuxt-file-storage.d.ts',
			getContents: () =>
				[
					'declare module \'#file-storage\' {',
					`  const ServerFile: typeof import('${resolve('./runtime/types')}').ServerFile`,
					`  const ClientFile: typeof import('${resolve('./runtime/types')}').ClientFile`,
					'}',
					'',
					'declare global {',
					`  type ServerFile = import('${resolve('./runtime/types')}').ServerFile`,
					`  type ClientFile = import('${resolve('./runtime/types')}').ClientFile`,
					'}',
					'',
					'export {}',
				].join('\n'),
		})

		nuxt.hook('prepare:types', async (options) => {
			options.references.push({ path: resolve(nuxt.options.buildDir, 'types/nuxt-file-storage.d.ts') })
		})
	},
})
