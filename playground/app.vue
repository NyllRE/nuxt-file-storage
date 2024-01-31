<template>
	<div class="main">
		<header>
			<img src="/nuxt-storage-logo.svg" alt="" class="logo" />
			<h1 class="text">
				<span class="nuxt"> Nuxt </span>
				Storage
			</h1>
		</header>

		<div class="links">
			<a v-for="link in fileLinks" :key="link" :href="`/userFiles/${link}`">{{ link }}</a>
		</div>
		<input
			id="file-input"
			type="file"
			name="files[]"
			multiple
			@input="handleFileInput"
			@click="approveUpload == ''"
		/>
		<button @click="submit">submit</button>
		<p>{{ approveUpload }}</p>
		<div class="images">
			<img v-for="file in files" :key="file.name" :src="file.content" alt="file.name" />
		</div>
	</div>
</template>

<script setup lang="ts">
const { handleFileInput, files } = useStorage()

const fileLinks = ref<string[]>(['e3'])
const approveUpload = ref('')

const submit = async () => {
	const response = await $fetch('/api/files', {
		method: 'POST',
		body: {
			files: files.value,
		},
	})
	if (!response) return
	approveUpload.value = 'Uploaded files successfully!'
	fileLinks.value = response
}
</script>

<style>
pre {
	width: 80%;
	overflow: hidden;
	text-overflow: ellipsis;
}

img.logo {
	width: 5em;
	animation: animate-in 0.5s alternate infinite;
}

.images {
	margin-top: 2em;
	padding: 1em;
	display: flex;
	gap: 2em;
	width: 80%;
	height: min-content;
	overflow-x: auto;
}

.images img {
	max-height: 15em;
	border-radius: 0.5em;
}

.links {
	display: grid;
	margin-block: 1em;
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

.main {
	font-family: 'Courier New', Courier, monospace;
	width: 100%;
	height: 100dvh;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
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
