<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showLongMessage = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  showLongMessage.value = false
  timer = setTimeout(() => {
    showLongMessage.value = true
  }, 3000)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <p class="m-0 opacity-60 text-sm italic">
    <span>Loading collective data</span>
    <span v-if="showLongMessage">. This may take a while for large datasets</span>
    <span class="inline-block align-bottom i-svg-spinners:3-dots-fade"></span>
  </p>
</template>
