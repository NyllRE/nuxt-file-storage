import { ref } from 'vue'
import type { ClientFile } from '../../types'

export default function () {
	const files = ref<ClientFile[]>([])
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

	const handleFileInput = async (event: any) => {

		const promises = []
		for (const file of event.target.files) {
			promises.push(serializeFile(file))
		}

		await Promise.all(promises)
	}

	return {
		files,
		handleFileInput,
	}
}
