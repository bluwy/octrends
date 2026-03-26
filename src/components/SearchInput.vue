<script setup lang="ts">
import { ref, computed } from 'vue'
import { debounce } from '../utils/common'
import { suggestedCollectives as allCollectives } from '../utils/constants'

const value = defineModel<string>({ default: '' })
const emit = defineEmits(['update:value', 'submit'])

const options = ref<{ value: string }[]>([])
const arrowSelectIndex = ref(-1)

const hintText = computed(() => {
  return arrowSelectIndex.value < 0 &&
    value.value &&
    options.value[0] &&
    options.value[0].value.toLowerCase().startsWith(value.value.toLowerCase())
    ? value.value + options.value[0].value.slice(value.value.length)
    : ''
})

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Tab' && hintText.value && options.value[0]) {
    value.value = options.value[0].value
    e.preventDefault()
  } else if (e.key === 'Enter' && options.value[arrowSelectIndex.value]) {
    e.preventDefault()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (options.value[arrowSelectIndex.value]) {
      value.value = options.value[arrowSelectIndex.value]!.value
    }
    arrowSelectIndex.value = -1
    return
  }

  if (e.key === 'ArrowUp') {
    arrowSelectIndex.value--
  } else if (e.key === 'ArrowDown') {
    arrowSelectIndex.value++
  } else {
    return
  }

  if (arrowSelectIndex.value < -1) {
    arrowSelectIndex.value = options.value.length - 1
  } else if (arrowSelectIndex.value >= options.value.length) {
    arrowSelectIndex.value = -1
  }

  if (value.value) {
    if (arrowSelectIndex.value >= 0) {
      value.value = options.value[arrowSelectIndex.value]!.value
    } else {
      value.value = value.value
    }
  }
}

const search = debounce(async () => {
  arrowSelectIndex.value = -1
  options.value = []

  if (!value.value) return

  // Poor man's search because I don't know how to efficiently search for collectives
  const searchTerm = value.value
  const matched = allCollectives.filter((c) => c.toLowerCase().includes(searchTerm.toLowerCase()))
  options.value = matched.slice(0, 10).map((name) => ({
    value: name,
  }))
}, 150)

function handleInput() {
  arrowSelectIndex.value = -1
  options.value = []
  search()
}

function handleSubmit() {
  if (!value.value) return
  emit('submit', value.value)
  getSelection()?.removeAllRanges()
  options.value = []
  value.value = ''
}

function highlightText(text: string, query: string) {
  return text.replace(query, (match) => `<strong>${match}</strong>`)
}
</script>

<template>
  <form class="relative isolate w-[200px] group z-50" @submit.prevent="handleSubmit">
    <div
      class="group-focus-within:block hidden border-rounded-1 w-full overflow-hidden border-none shadow-lg bg-white text-black absolute top-0 -z-1 transition-shadow"
    >
      <!-- Hint for "Tab" -->
      <input
        type="text"
        class="w-full px-2 py-1 m-0 text-sm bg-transparent text-red pointer-events-none truncate border-none"
        aria-label="Search collective"
        :placeholder="hintText || ' '"
        readonly
        tabindex="-1"
      />
      <ul
        v-if="options.length"
        class="w-full list-none m-0 p-0 border-0 border-t border-gray"
        tabindex="-1"
        role="listbox"
      >
        <li
          v-for="(opt, i) in options"
          :key="opt.value"
          class="m-0 py-0 bg-gray bg-opacity-0 hover:bg-opacity-25 transition-colors"
          :class="{ 'bg-opacity-25': arrowSelectIndex === i }"
          role="option"
          :aria-selected="arrowSelectIndex === i"
        >
          <button
            class="bg-transparent flex justify-between m-0 border-none text-sm w-full block text-left px-2 py-1"
            @click="value = opt.value"
            type="button"
          >
            <span class="text-black" v-html="highlightText(opt.value, value)"></span>
          </button>
        </li>
      </ul>
    </div>
    <input
      v-model="value"
      class="w-full px-2 py-1 m-0 bg-white text-black focus:outline-none text-sm truncate group-focus-within:bg-transparent border-rounded-1 border-none shadow-sm group-focus-within:shadow-none transition-shadow"
      type="text"
      aria-label="Search collective"
      placeholder="Search collective"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      @input="handleInput"
      @keydown="handleKeyDown"
      @keyup="handleKeyUp"
    />
    <button
      class="absolute top-1.5 right-0 w-4 h-4 text-black border-none px-4 i-heroicons:magnifying-glass"
      type="submit"
      aria-label="Submit collective search"
    ></button>
  </form>
</template>
