<template>
	<div style="padding: 2rem;">
		<h2>Test defineExpose with Iterable Files</h2>
		
		<TestChild ref="childRef" />
		
		<div style="margin-top: 2rem;">
			<button @click="iterateFiles">Iterate Over Files (without .value.value)</button>
			<button @click="clearChildFiles">Clear Files</button>
			
			<h3>Files in Child Component:</h3>
			<ul>
				<li v-for="(file, index) in childFiles" :key="index">
					{{ file.name }} ({{ file.size }} bytes)
				</li>
			</ul>
			
			<div v-if="iterationLog.length > 0">
				<h3>Iteration Log:</h3>
				<pre>{{ iterationLog.join('\n') }}</pre>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const childRef = ref()
const childFiles = ref<any[]>([])
const iterationLog = ref<string[]>([])

// Iterate over files directly from the exposed ref
// This should work without .value.value thanks to the iterable ref
const iterateFiles = () => {
	iterationLog.value = []
	childFiles.value = []
	
	try {
		// Try to iterate without .value.value
		iterationLog.value.push('Attempting to iterate: for (const file of childRef.value.files)')
		
		for (const file of childRef.value.files) {
			iterationLog.value.push(`  - Found file: ${file.name}`)
			childFiles.value.push(file)
		}
		
		iterationLog.value.push('✓ Success! Iteration works without .value.value')
	} catch (error: any) {
		iterationLog.value.push(`✗ Error: ${error.message}`)
		
		// Fallback to traditional .value.value approach
		iterationLog.value.push('')
		iterationLog.value.push('Falling back to: for (const file of childRef.value.files.value)')
		
		for (const file of childRef.value.files.value) {
			iterationLog.value.push(`  - Found file: ${file.name}`)
			childFiles.value.push(file)
		}
	}
}

const clearChildFiles = () => {
	if (childRef.value) {
		childRef.value.clearFiles()
		childFiles.value = []
		iterationLog.value = []
	}
}
</script>
