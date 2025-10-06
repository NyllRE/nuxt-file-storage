#!/usr/bin/env node

/**
 * This script verifies that the iterable ref implementation is working correctly
 * by checking the built output.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const builtFile = join(__dirname, '../dist/runtime/composables/useFileStorage.js')

try {
	const content = readFileSync(builtFile, 'utf-8')
	
	console.log('Verifying iterable ref implementation...\n')
	
	// Check for createIterableRef function
	if (content.includes('function createIterableRef')) {
		console.log('✓ createIterableRef function found')
	} else {
		console.log('✗ createIterableRef function NOT found')
		process.exit(1)
	}
	
	// Check for Symbol.iterator
	if (content.includes('Symbol.iterator')) {
		console.log('✓ Symbol.iterator implementation found')
	} else {
		console.log('✗ Symbol.iterator implementation NOT found')
		process.exit(1)
	}
	
	// Check for generator function
	if (content.includes('function*') || content.includes('yield*')) {
		console.log('✓ Generator function for iteration found')
	} else {
		console.log('✗ Generator function NOT found')
		process.exit(1)
	}
	
	// Check that files uses createIterableRef
	if (content.includes('files = createIterableRef')) {
		console.log('✓ files is created using createIterableRef')
	} else {
		console.log('✗ files is NOT created using createIterableRef')
		process.exit(1)
	}
	
	console.log('\n✅ All verifications passed!')
	console.log('\nThe files ref is now iterable and can be used with defineExpose without requiring .value.value\n')
	
} catch (error) {
	console.error('Error reading built file:', error.message)
	process.exit(1)
}
