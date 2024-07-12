import { ref } from "vue";

export default function () {
	const files = ref<File[]>([])
	const serializeFile = (file: File) => {
		const reader = new FileReader()
		reader.onload = (e: any) => {
			files.value.push({
				...file,
				name: file.name,
				size: file.size,
				type: file.type,
				lastModified: file.lastModified,
				content: e.target.result,
			})
		}
		reader.readAsDataURL(file)
	}

	const handleFileInput = (event: any): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			files.value.splice(0)
			// console.log('handleFileInput event: ' + event)

			const promises = []
			for (const file of event.target.files) {
				promises.push(serializeFile(file))
			}

			Promise.all(promises)
				.then(() => resolve())
				.catch((error) => reject(error))
		})
	}


	return {
		files,
		handleFileInput,
	}
}

interface File extends Blob {
	content: any
	name: string
	lastModified: string
}
