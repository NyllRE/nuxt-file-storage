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
		// addServerImportsDir(resolve('./runtime/server/utils'))

		// virtual imports
		// nuxt.hook('nitro:config', (_config) => {
		// 	_config.alias = _config.alias || {}

		// 	// Inline module runtime in Nitro bundle
		// 	_config.externals = defu(typeof _config.externals === 'object' ? _config.externals : {}, {
		// 		inline: [resolve('./runtime')],
		// 	})
		// 	_config.alias['#nuxt/file-storage'] = resolve('./runtime/server/utils/storage')
		// })

		// // logger.info(join(nuxt.options.serverDir, options.mount!))

		// const template = addTemplate({
		// 	filename: 'types/nuxt-file-storage.d.ts',
		// 	getContents: () =>
		// 		[
		// 			"declare module '#nuxt/file-storage' {",
		// 			`	const storeFileLocally: typeof import('${resolve(
		// 				'./runtime/server/utils/storage',
		// 			)}').storeFileLocally`,
		// 			`	const deleteFile: typeof import('${resolve(
		// 				'./runtime/server/utils/storage',
		// 			)}').deleteFile`,
		// 			'}',
		// 			`	const parseDataUrl: typeof import('${resolve(
		// 				'./runtime/server/utils/storage',
		// 			)}').parseDataUrl`,
		// 			'}',
		// 		].join('\n'),
		// })

		// nuxt.hook('prepare:types', ({ references }) => {
		// 	references.push({ path: template.dst })
		// })
	},
})
