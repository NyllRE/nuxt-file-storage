![Nuxt Storage Banner](./playground/public/nuxt-nitro-storage-banner.svg)

# Nuxt Nitro Storage

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]


Easy solution to store files in your nuxt apps. Be able to upload files from the frontend and recieve them from the backend to then save the files in your project.

-  [✨ &nbsp;Release Notes](/CHANGELOG.md)
-  [🏀 Online playground](https://stackblitz.com/github/NyllRE/nuxt-nitro-storage?file=playground%2Fapp.vue)
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

<!-- Highlight some of the features your module provide here -->

-  📁 &nbsp;Get files from file input and make them ready to send to backend
-  ⚗️ &nbsp;Serialize files in the backend to be able to use them appropriately
-  🖴 &nbsp;Store files in a specified location in your Nuxt backend with Nitro Engine

## Quick Setup

1. Add `nuxt-nitro-storage` dependency to your project

```bash
# Using pnpm
pnpm add -D nuxt-nitro-storage

# Using yarn
yarn add --dev nuxt-nitro-storage

# Using npm
npm install --save-dev nuxt-nitro-storage
```

2. Add `nuxt-nitro-storage` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
	modules: ['nuxt-nitro-storage'],
})
```

That's it! You can now use Nuxt Storage in your Nuxt app ✨

## Configuration

You can currently configure a single setting of the `nuxt-nitro-storage` module. Here is the config interface:

```js
export default defineNuxtConfig({
	modules: ['nuxt-nitro-storage'],
	nitroStorage: {
		// enter the absolute path to the location of your storage
		mount: '/home/$USR/development/nuxt-nitro-storage/server/files',

		// {OR} use environment variables (recommended)
		mount: process.env.mount
		// you need to set the mount in your .env file at the root of your project
	},
})
```

## Usage

### Handling Files in the frontend
You can use Nuxt Storage to get the files from the `<input>` tag:

```html
<template>
	<input type="file" @input="handleFileInput" />
</template>

<script setup>
	// handleFileInput can handle multiple files
	const { handleFileInput, files } = useNitroStorage()
</script>
```
The `files` return a ref object that contains the files

Here's an example of using files to send them to the backend:
```html
<template>
	<input type="file" @input="handleFileInput" />
	<button @click="submit">submit</button>
</template>

<script setup>
const { handleFileInput, files } = useNitroStorage()

const submit = async () => {
	const response = await $fetch('/api/files', {
		method: 'POST',
		body: {
			files: files.value
		}
	})
}
</script>
```


### Handling files in the backend
using Nitro Server Engine, we will make an api route that recieves the files and stores them in the folder `userFiles`
```ts
export default defineEventHandler(async (event) => {
	const { file } = await readBody<{ file: File }>(event)

	await storeFileLocally(
		file.content, // the stringified version of the file
		file.name,    // the name of the file
		'/userFiles'  // the folder the file will be stored in
	)

	// {OR}

	const {binaryString, ext} = parseDataUrl(file.content)

	return 'success!'
})

interface File {
	name: string
	content: string
}
```

And that's it! Now you can store any file in your nuxt project from the user ✨

## Contribution
Run into a problem? Open a [new issue](https://github.com/NyllRE/nuxt-nitro-storage/issues/new). I'll try my best to include all the features requested if it is fitting to the scope of the project.

Want to add some feature? PRs are welcome!
- Clone this repository
- install the dependencies
- prepare the project
- run dev server
```bash
git clone https://github.com/NyllRE/nuxt-nitro-storage && cd nuxt-nitro-storage
npm i
npm run dev:prepare
npm run dev
```


<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/nuxt-nitro-storage/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-nitro-storage
[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-nitro-storage.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-nitro-storage
[license-src]: https://img.shields.io/npm/l/nuxt-nitro-storage.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-nitro-storage
[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
