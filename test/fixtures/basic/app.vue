<template>
  <input type="file" multiple @input="handleFileInput">
</template>

<script setup>
const { handleFileInput, files } = useNitroStorage()
</script>
