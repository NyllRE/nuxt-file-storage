import { ref, type Ref } from 'vue'
import type { ClientFile } from '../../types'

type Options = {
	clearOldFiles: boolean
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

export default function (options: Options = { clearOldFiles: true }) {
	const files = createIterableRef<ClientFile>([])
	const serializeFile = (file: ClientFile): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = (e: ProgressEvent<FileReader>) => {
				files.value.push({
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

	const clearFiles = () => {
		files.value.splice(0, files.value.length)
	}


	const handleFileInput = async (event: any) => {
		if (options.clearOldFiles) {
			clearFiles()
		}

		const promises = []
		for (const file of event.target.files) {
			promises.push(serializeFile(file))
		}

		await Promise.all(promises)
	}

	return {
		files,
		handleFileInput,
		clearFiles,
	}
}
