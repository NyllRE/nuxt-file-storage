<template>
  <div class="main">
    <h1 class="text"><span class="nuxt"> Nuxt </span> module playground!</h1>
    <!-- <pre>{{ files }}</pre> -->
    <input id="file-input" type="file" name="files[]" multiple @input="handleFileInput">
    <img v-for="file in files" :src="file.content" :key="file.name" alt="file.name">
  </div>
</template>

<script setup lang="ts">
const { handleFileInput, files } = useStorage();
</script>

<style>
pre {
  width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
}

img {
  width: 40em;
  margin-bottom: 2em;
  border-radius: .5em;
}

.main {
  width: 100%;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.text {
  font-family: "Courier New", Courier, monospace;
  font-size: 5em;
  animation: animate-in 0.5s 0.5s alternate infinite;
}

.nuxt {
  background: linear-gradient(135deg,
      rgb(70, 255, 178),
      #5aff45,
      rgb(37, 153, 8));
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes animate-in {
  from {
    transform: translateY(10%);
  }

  to {
    transform: translateY(-10%);
  }
}
</style>
