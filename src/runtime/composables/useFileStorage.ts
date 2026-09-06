import { ref, type Ref, unref } from 'vue'
import type { ClientFile } from '../../types'

type StorageMode = 'DataURL' | 'Multipart'

type SerializedFile = {
	name: string
	size: number
	type: string
	lastModified: number
	content: string | ArrayBuffer | null
}

type Options = {
	/** If true, selecting new files clears the previous list. Default: true */
	deleteOldFiles?: boolean
	/** Legacy alias for deleteOldFiles. */
	clearOldFiles?: boolean
	/** Upload mode: 'DataURL' (base64 JSON, deprecated) or 'Multipart' (FormData, recommended). Default: 'DataURL' */
	storageMode?: StorageMode
}

function createIterableRef<T>(initialValue: T[]): Ref<T[]> & Iterable<T> {
	const refObj = ref<T[]>(initialValue)

	Object.defineProperty(refObj, Symbol.iterator, {
		value: function* () {
			yield* refObj.value
		},
		enumerable: false,
		configurable: true,
	})

	return refObj as Ref<T[]> & Iterable<T>
}

/**
 * Composable for handling file inputs.
 *
 * Supports two modes:
 *  - **Multipart**: keeps files as native `File` objects in a `FormData` ref,
 *    ready to send directly as a multipart/form-data request.
 *  - **DataURL** (deprecated): serialises files to base64 data URLs for JSON
 *    bodies while preserving the legacy iterable `files` ref.
 */
export default function (options: Options = {}) {
	const deleteOldFiles = options.deleteOldFiles ?? options.clearOldFiles ?? true
	const storageMode: StorageMode = options.storageMode ?? 'DataURL'

	const files = storageMode === 'Multipart'
		? ref<FormData>(new FormData())
		: createIterableRef<ClientFile>([])
	const jsonFiles = ref<SerializedFile[]>([])

	const clearFiles = (fileInputRef?: Ref<HTMLInputElement | null>) => {
		if (storageMode === 'Multipart') {
			files.value = new FormData()
		} else {
			;(files.value as ClientFile[]).splice(0)
			jsonFiles.value.splice(0)
		}

		const el = fileInputRef ? unref(fileInputRef) : null
		if (el) {
			el.value = ''
		}
	}

	const serializeFile = (file: File): Promise<SerializedFile> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => {
				resolve({
					name: file.name,
					size: file.size,
					type: file.type,
					lastModified: file.lastModified,
					content: reader.result,
				})
			}
			reader.onerror = () => reject(reader.error)
			reader.readAsDataURL(file)
		})
	}

	const handleFileInput = async (event: Event) => {
		const target = event.target as HTMLInputElement
		if (!target.files) return

		if (deleteOldFiles) {
			clearFiles()
		}

		if (storageMode === 'Multipart') {
			const formData = files.value as FormData
			for (const file of Array.from(target.files)) {
				formData.append('files', file)
			}
			return
		}

		const legacyFiles = files.value as ClientFile[]
		for (const file of Array.from(target.files)) {
			const serialized = await serializeFile(file)
			legacyFiles.push(Object.assign(file, { content: serialized.content }) as ClientFile)
			jsonFiles.value.push(serialized)
		}
	}

	/** Legacy JSON-only handler. Prefer handleFileInput in DataURL mode. */
	const handleJsonFileInput = async (event: Event) => {
		const target = event.target as HTMLInputElement
		if (!target.files) return

		if (deleteOldFiles) {
			jsonFiles.value.splice(0)
		}

		for (const file of Array.from(target.files)) {
			jsonFiles.value.push(await serializeFile(file))
		}
	}

	return {
		files,
		jsonFiles,
		handleFileInput,
		handleJsonFileInput,
		clearFiles,
	}
}
