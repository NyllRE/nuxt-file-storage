import { ref, type Ref, unref } from 'vue'
import type { ClientFile } from '../../types'

type Options = {
	deleteOldFiles?: boolean
	/** @deprecated Use `deleteOldFiles` instead */
	clearOldFiles?: boolean
	storageMode?: 'Multipart' | 'DataURL'
	onProgress?: (percentage: number) => void
}

type SubmitOptions = {
	extraBody?: Record<string, any>
	onProgress?: (percentage: number) => void
	signal?: AbortSignal
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

export default function (options: Options = {}) {
	const isMultipart = (options.storageMode ?? 'Multipart') === 'Multipart'
	const shouldDeleteOld = options.deleteOldFiles ?? options.clearOldFiles ?? true

	const formData = ref<FormData>(new FormData())
	const dataUrlFiles = createIterableRef<ClientFile>([])

	const files: FormData | (Ref<ClientFile[]> & Iterable<ClientFile>) = isMultipart
		? formData.value
		: dataUrlFiles

	const serializeFile = (file: ClientFile): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = (e: ProgressEvent<FileReader>) => {
				dataUrlFiles.value.push({
					...file,
					name: file.name,
					size: file.size,
					type: file.type,
					lastModified: file.lastModified,
					content: e.target?.result,
				})
				resolve()
			}
			reader.onerror = (error) => {
				reject(error)
			}
			reader.readAsDataURL(file)
		})
	}

	const clearFiles = (fileInputRef?: Ref<HTMLInputElement | null>) => {
		if (isMultipart) {
			formData.value = new FormData()
		} else {
			dataUrlFiles.value.splice(0, dataUrlFiles.value.length)
		}
		const el = fileInputRef ? unref(fileInputRef) : null
		if (el) {
			el.value = ''
		}
	}

	const handleFileInput = async (event: any) => {
		if (shouldDeleteOld) {
			clearFiles()
		}

		if (isMultipart) {
			for (const file of event.target.files) {
				formData.value.append(file.name, file)
			}
		} else {
			const promises = []
			for (const file of event.target.files) {
				promises.push(serializeFile(file))
			}
			await Promise.all(promises)
		}
	}

	const submit = async (endpoint: string, opts?: SubmitOptions): Promise<any> => {
		const { extraBody, onProgress, signal } = opts || {}
		const progressCb = onProgress ?? options.onProgress

		if (isMultipart) {
			const body = formData.value

			if (progressCb) {
				return new Promise((resolve, reject) => {
					const xhr = new XMLHttpRequest()
					xhr.upload.onprogress = (e) => {
						if (e.lengthComputable) {
							progressCb(Math.round((e.loaded / e.total) * 100))
						}
					}
					xhr.onload = () => {
						try {
							resolve(JSON.parse(xhr.responseText))
						} catch {
							resolve(xhr.responseText)
						}
					}
					xhr.onerror = () => reject(new Error('Upload failed'))
					xhr.open('POST', endpoint)
					if (signal) signal.addEventListener('abort', () => xhr.abort())
					xhr.send(body)
				})
			}

			return $fetch(endpoint, {
				method: 'POST',
				body,
				signal,
			})
		}

		return $fetch(endpoint, {
			method: 'POST',
			body: {
				files: dataUrlFiles.value,
				...extraBody,
			},
			signal,
		})
	}

	return {
		files,
		handleFileInput,
		clearFiles,
		submit,
	}
}
