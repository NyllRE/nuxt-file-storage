<template>
	<div class="uploader">
		<label class="drop-container">
			<span class="drop-title">Choose files</span>
			<input type="file" multiple @input="handleFileInput" />
		</label>
		<div class="preview">
			<div v-for="file in files" :key="file.name" class="file-badge">
				{{ file.name }} ({{ file.size }} bytes)
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { handleFileInput, files, clearFiles } = useFileStorage({ clearOldFiles: false })

defineExpose({
	files,
	handleFileInput,
	clearFiles,
})
</script>

<style scoped>
.uploader {
	border: 1px solid #333;
	border-radius: 8px;
	padding: 1em;
	display: flex;
	flex-direction: column;
	gap: 0.75em;
}
.drop-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5em;
	padding: 1em;
	border: 2px dashed #555;
	border-radius: 8px;
	cursor: pointer;
}
.drop-title { font-weight: bold; color: #ccc; }
.preview { display: flex; flex-wrap: wrap; gap: 0.5em; }
.file-badge {
	background: #2a2a2a;
	padding: 0.3em 0.6em;
	border-radius: 4px;
	font-size: 0.85em;
	color: #aaa;
}
</style>
