import { ref } from "vue";

export default function () {
	const files = ref<File[]>([])
	const filesList = ref<File[]>([])
	const serializeFile = (file: File) => {
		const reader = new FileReader()
		reader.onload = (e: any) => {
			files.value.push({
				...file,
				content: e.target.result,
			})
		}
		reader.readAsDataURL(file)
	}

	const handleFileInput = (event: any) => {
		files.value.splice(0)
		console.log('handleFileInput event: ', event)

		for (const file of event.target.files) {
			filesList.value.push(file)
			serializeFile(file)
		}
	}

	return {
		files,
		filesList,
		handleFileInput,
	}
}

interface File extends Blob {
	content: any
	name: string
}
