import { ref } from 'vue'

type StorageMode = 'DataURL' | 'Multipart'

type Options = {
	/** If true, selecting new files clears the previous list. Default: true */
	deleteOldFiles?: boolean
	/** Upload mode: 'DataURL' (base64 JSON, deprecated) or 'Multipart' (FormData, recommended). Default: 'DataURL' */
	storageMode?: StorageMode
}

/**
 * Composable for handling file inputs.
 *
 * Supports two modes:
 *  - **Multipart**: keeps files as native `File` objects, exposes `FormData`
 *    via the `files` ref — ideal for `multipart/form-data` uploads.
 *  - **DataURL** (deprecated): serialises files to base64 data URLs for JSON body.
 */
export default function (options: Options = {}) {
	const deleteOldFiles = options.deleteOldFiles ?? true
	const storageMode: StorageMode = options.storageMode ?? 'DataURL'

	const files = ref<File[] | FormData>(storageMode === 'Multipart' ? new FormData() : [])
	const jsonFiles = ref<Array<{ name: string; size: number; type: string; lastModified: number; content: string | ArrayBuffer | null }>>([])

	const clearFiles = () => {
		if (storageMode === 'Multipart') {
			files.value = new FormData()
		} else {
			(files.value as File[]).splice(0)
			jsonFiles.value.splice(0)
		}
	}

	const handleFileInput = async (event: Event) => {
		const target = event.target as HTMLInputElement
		if (!target.files) return

		if (deleteOldFiles) {
			clearFiles()
		}

		if (storageMode === 'Multipart') {
			const fd = files.value as FormData
			for (const file of Array.from(target.files)) {
				fd.append('files', file)
			}
		} else {
			// DataURL mode — serialise to base64 for JSON upload
			const nativeFiles = files.value as File[]
			for (const file of Array.from(target.files)) {
				nativeFiles.push(file)
				const serialized = await serializeFile(file)
				jsonFiles.value.push(serialized)
			}
		}
	}

	/**
	 * Legacy JSON-only handler (deprecated).
	 * Use `handleFileInput` instead — this exists for backwards compat only.
	 */
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

	const serializeFile = (file: File): Promise<{ name: string; size: number; type: string; lastModified: number; content: string | ArrayBuffer | null }> => {
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

	return {
		files,
		jsonFiles,
		handleFileInput,
		handleJsonFileInput,
		clearFiles,
	}
}
