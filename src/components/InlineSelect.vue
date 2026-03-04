<script setup lang="ts">
const model = defineModel<string>()
const props = defineProps<{
  options: { label: string; value: string }[]
}>()
</script>

<template>
  <select
    v-model="model"
    class="bg-transparent border-none shadow-none font-normal font-sans font-size-inherit px-0 py-0 text-inherit focus:outline-none focus:ring-1 focus:ring-gray-400 align-baseline min-w-0"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
