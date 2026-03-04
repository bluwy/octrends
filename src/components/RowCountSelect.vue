<script setup lang="ts">
const model = defineModel<number>()

const rowCountOptions = [10, 20, 50, 100, Infinity] as const

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  model.value = value === 'Infinity' ? Infinity : Number(value)
}
</script>

<template>
  <span class="flex items-center gap-1">
    <label for="row-count-select" class="text-sm text-gray-500">Rows:</label>
    <select
      id="row-count-select"
      :value="model"
      @change="onChange"
      class="border rounded px-1 py-0.5 text-sm"
    >
      <option v-for="opt in rowCountOptions" :key="opt" :value="opt">
        {{ opt === Infinity ? 'All' : opt }}
      </option>
    </select>
  </span>
</template>
