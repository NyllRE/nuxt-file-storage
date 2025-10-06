# Before vs After: defineExpose with files

## ❌ BEFORE (Issue)

When using `defineExpose` to expose the `files` ref, users had to use awkward double `.value`:

```vue
<!-- Child Component -->
<script setup>
const { handleFileInput, files, clearFiles } = useFileStorage()

defineExpose({
  files,
  handleFileInput,
  clearFiles
})
</script>
```

```vue
<!-- Parent Component -->
<script setup>
const childRef = ref()

// ❌ Required awkward double .value
for (const file of childRef.value.files.value) {
  console.log(file.name)
}
</script>
```

**Error message:** "files is not iterable"

---

## ✅ AFTER (Fixed)

Now the `files` ref is iterable, so you only need one `.value`:

```vue
<!-- Child Component -->
<script setup>
const { handleFileInput, files, clearFiles } = useFileStorage()

defineExpose({
  files,           // ✨ Now iterable!
  handleFileInput,
  clearFiles
})
</script>
```

```vue
<!-- Parent Component -->
<script setup>
const childRef = ref()

// ✅ Clean, ergonomic syntax
for (const file of childRef.value.files) {
  console.log(file.name)
}

// ✅ Traditional .value.value still works for backward compatibility
console.log(childRef.value.files.value)
</script>
```

---

## How It Works

The solution adds `Symbol.iterator` to the `files` ref, making it directly iterable:

```typescript
function createIterableRef<T>(initialValue: T[]) {
  const refObj = ref<T[]>(initialValue)
  
  // Add Symbol.iterator to make it iterable
  Object.defineProperty(refObj, Symbol.iterator, {
    value: function* () {
      yield* refObj.value
    },
    enumerable: false,
    configurable: true
  })
  
  return refObj
}
```

---

## Test Results

✅ All 5 unit tests passing:
- ✓ Files ref is iterable without `.value`
- ✓ Backward compatibility: traditional `.value` access still works
- ✓ Multiple files can be iterated correctly
- ✓ defineExpose use case works as expected
- ✓ Both old and new syntax work

✅ Linting passes
✅ Build succeeds
✅ Zero breaking changes
