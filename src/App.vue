<script setup lang="ts">
import { ref, watch } from 'vue'
import BalanceOverTimeChart from './components/charts/BalanceOverTimeChart.vue'
import SearchInput from './components/SearchInput.vue'
import Label from './components/Label.vue'
import githubIcon from './assets/github.svg'
import type { CollectiveData } from './types'

// Example orgs, can be dynamic or fetched
const selectedOrgs = ref<string[]>(['e18e', 'vitest'])
const data = ref<CollectiveData[]>([])

watch([selectedOrgs], fetchData, { immediate: true, deep: true })
async function fetchData() {
  console.log('Fetching data for orgs:', selectedOrgs.value)
  const newData: CollectiveData[] = []

  await Promise.all(
    selectedOrgs.value.map(async (org) => {
      try {
        const res = await fetch(`/api/transactions/${org}`)
        const result = await res.json()
        newData.push({ name: org, transactions: result.transactions })
      } catch (e) {
        console.error(`Error fetching data for ${org}:`, e)
      }
    }),
  )

  data.value = newData.sort((a, b) => {
    return selectedOrgs.value.indexOf(a.name) - selectedOrgs.value.indexOf(b.name)
  })
}
</script>

<template>
  <div>
    <section class="w-full max-w-2xl px-4 mt-6 mx-auto">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-500 m-0">Open Collective Trends</h1>
        <a href="https://github.com/bluwy/octrends">
          <img :src="githubIcon" alt="GitHub" class="w-5 h-5" />
        </a>
      </div>
      <p class="opacity-60 mt-2 mb-6">Analyze and compare collective fundings</p>
      <SearchInput @submit="(value) => selectedOrgs.push(value)" />
      <div class="flex flex-wrap gap-2 my-4">
        <Label
          v-for="org in selectedOrgs"
          :key="org"
          closable
          @close="selectedOrgs.splice(selectedOrgs.indexOf(org), 1)"
        >
          <a
            class="text-gray-100 decoration-none hover:underline focus:underline"
            :href="`https://opencollective.com/${org}`"
            target="_blank"
          >
            {{ org }}
          </a>
        </Label>
      </div>
    </section>
    <section class="w-full max-w-2xl px-4 mx-auto">
      <hr />
      <BalanceOverTimeChart :data="data" />
    </section>
  </div>
</template>
