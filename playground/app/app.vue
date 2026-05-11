<template>
	<div class="main">
		<header style="gap:.75em">
			<h1 class="text">
				<span class="nuxt"> Nuxt </span>
			</h1>
			<img src="/nuxt-file-storage-logo.svg" alt="" class="logo" />
			<h1 class="text">
				Demo
			</h1>
		</header>

		<div class="container">
			<div class="input-container">
				<div class="links">
					<a v-for="link in fileLinks" :key="link" :href="`/api/get/${link}`">{{ link }}</a>
				</div>
				<label
					id="dropcontainer"
					for="images"
					class="drop-container"
					@dragover.prevent
					@dragenter.prevent="(e: any) => {e.target.classList.add('drag-active')}"
					@dragleave.prevent="(e: any) => {e.target.classList.remove('drag-active')}"
					@drop.prevent="handleDrop"
				>
					<span class="drop-title">Drop files here</span>
					or
					<input
						id="file-input"
						ref="fileInput"
						type="file"
						name="files[]"
						multiple
						@input="handleFileInput"
						@click="approveUpload == ''"
					/>
				</label>
				<button @click="submit">submit</button>
				<p>{{ approveUpload }}</p>
			</div>
			<div class="images">
				<img v-for="preview in previews" :key="preview" :src="preview" alt="uploaded file" />
			</div>
	</div>
	</div>
</template>

<script setup lang="ts">
// Multipart mode — recommended
const { handleFileInput, files } = useFileStorage({
	deleteOldFiles: true,
	storageMode: 'Multipart',
})

const fileInput = ref<HTMLInputElement>()
const previews = ref<string[]>([])

const handleDrop = (e: any) => {
	alert("drag and drop functionality does not work currently, you can try to fix it in the repo :)")
}

const fileLinks = ref<string[]>([])
const approveUpload = ref('')

// Generate local previews from native File objects
watch(files, (newFiles) => {
	// FormData entries — iterate to build previews
	if (newFiles instanceof FormData) {
		previews.value = []
		for (const [_, value] of newFiles.entries()) {
			if (value instanceof File) {
				previews.value.push(URL.createObjectURL(value))
			}
		}
	}
})

const submit = async () => {
	// Multipart mode: `files` is already a FormData, send directly
	const response = await $fetch('/api/files', {
		method: 'POST',
		body: files.value as FormData,
	})

	if (!response) return
	approveUpload.value = 'Uploaded files successfully!'
	fileLinks.value = response
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

pre {
	width: 80%;
	overflow: hidden;
	text-overflow: ellipsis;
}

img.logo {
	width: 4.5em;
}

.container {
	display: flex;
	height: 30em;
}

.input-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1em;
}

.images {
	padding: 1em;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2em;
	width: 80%;
	min-height: 100%;
	overflow-y: auto;
	scrollbar-width: thin;
}

::-webkit-scrollbar-track {
	background-color: #87ff5b;
}

::-webkit-scrollbar-thumb {
	background-color: #64ffc3;
	border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
	background-color: #ccc;
}

.images img {
	max-height: 15em;
	border-radius: 0.5em;
}

.links {
	display: grid;
	margin-block: 1em;
	gap: 1em;
}

.links a {
	padding: 0.5em 1em;
	background: lightgreen;
	border-radius: 0.3em;
	text-decoration: none;
	color: black;
}

header {
	display: flex;
	align-items: center;
	gap: 2em;
}

.drop-container {
  position: relative;
  display: flex;
  gap: 10px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  padding: 20px;
  border-radius: 10px;
  border: 2px dashed #555;
  color: #444;
  cursor: pointer;
  transition: background .2s ease-in-out, border .2s ease-in-out;
}

.drop-container:hover {
  background: #eee;
  border-color: #111;
}

.drop-container:hover .drop-title {
  color: #222;
}

.drop-title {
  color: #444;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  transition: color .2s ease-in-out;
}

input[type=file]::file-selector-button, button {
  margin-right: 20px;
  border: none;
  background: lightgreen;
  padding: 10px 20px;
  border-radius: 10px;
  color: black;
  cursor: pointer;
  transition: background .2s ease-in-out;
}

input[type=file]::file-selector-button:hover, button:hover {
  background: rgb(75, 197, 75);
}

.drop-container.drag-active {
  background: #eee;
  border-color: #111;
}

.drop-container.drag-active .drop-title {
  color: #222;
}

.main {
	font-family: 'DM Sans', Courier, monospace;
	width: 100%;
	height: 100dvh;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	gap: 1em
}

.text {
	font-size: 3em;
}

.nuxt {
	background: linear-gradient(135deg, rgb(70, 255, 178), #00dc82, rgb(37, 153, 8));
	background-clip: text;
	-webkit-text-fill-color: transparent;
}

@keyframes animate-in {
	from {
		transform: translateY(5%);
	}

	to {
		transform: translateY(-5%);
	}
}
</style>
