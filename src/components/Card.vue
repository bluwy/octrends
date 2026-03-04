<script setup lang="ts">
import type { Account } from '../utils/types'

const props = defineProps<{
  account: Account
}>()
const emit = defineEmits(['close'])

function getSocialIconClass(type: string) {
  switch (type) {
    case 'WEBSITE':
      return 'i-heroicons:globe-alt-solid'
    case 'GITHUB':
      return 'i-simple-icons:github'
    case 'TWITTER':
      return 'i-simple-icons:twitter'
    case 'DISCORD':
      return 'i-simple-icons:discord'
    case 'MASTODON':
      return 'i-simple-icons:mastodon'
    case 'BLUESKY':
      return 'i-simple-icons:bluesky'
    default:
      return 'i-heroicons:link-solid'
  }
}
</script>

<template>
  <div
    class="flex flex-col bg-gray-500 bg-opacity-10 rounded-md border-1 border-gray-700 border-solid w-72 p-2"
  >
    <div class="flex-grow">
      <div class="flex items-center gap-2">
        <img
          v-if="account.imageUrl"
          :src="account.imageUrl"
          alt="Logo"
          class="w-5 h-5 rounded-sm bg-gray-800"
        />
        <a
          class="text-sm flex-grow text-gray-100 truncate decoration-none hover:underline focus:underline"
          :href="`https://opencollective.com/${account.slug}`"
          target="_blank"
        >
          {{ account.name ?? account.slug }}
        </a>
        <button
          class="text-gray-100 hover:text-red-500 text-lg p-2 mr-0.5 i-heroicons:x-mark"
          @click="() => emit('close')"
          aria-label="Remove"
        ></button>
      </div>
      <p
        class="text-xs line-clamp-2 text-gray-100 opacity-60 my-2"
        :title="account.description || ''"
      >
        {{ account.description || '' }}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a
        v-for="link in account.socialLinks || []"
        :href="link.url"
        target="_blank"
        class="text-gray-100 text-opacity-50 hover:text-opacity-90 focus:text-opacity-90 text-md"
        :class="getSocialIconClass(link.type)"
        :aria-label="link.type"
      ></a>
    </div>
  </div>
</template>

<style scoped>
/* not in preset-mini */
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
</style>
