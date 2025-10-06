<template>
	<div>
		<h3>Test defineExpose with files</h3>
		<input type="file" multiple @input="handleFileInput" />
	</div>
</template>

<script setup lang="ts">
const { handleFileInput, files, clearFiles } = useFileStorage()

// Expose files for parent component access
defineExpose({
	files,
	handleFileInput,
	clearFiles
})
</script>
