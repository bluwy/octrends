<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BalanceOverTimeChart from './components/charts/BalanceOverTimeChart.vue'
import MonthlyIncomeChart from './components/charts/MonthlyIncomeChart.vue'
import MonthlyExpenseChart from './components/charts/MonthlyExpenseChart.vue'
import DateRangePicker from './components/DateRangePicker.vue'
import SearchInput from './components/SearchInput.vue'
import Label from './components/Label.vue'
import githubIcon from './assets/github.svg'
import { endOfToday, getEarliestDate } from './utils/date'
import type { CollectiveData } from './utils/types'

// Example orgs, can be dynamic or fetched
const selectedOrgs = ref<string[]>(['e18e', 'vitest'])
const data = ref<CollectiveData[]>([])

const dateRange = ref<[Date, Date]>()
const earliestDate = computed(() => getEarliestDate(data.value))
const selectedEarliestDate = computed(() =>
  dateRange.value ? dateRange.value[0] : earliestDate.value,
)
const selectedLatestDate = computed(() => (dateRange.value ? dateRange.value[1] : endOfToday))

watch([selectedOrgs], fetchData, { immediate: true, deep: true })
async function fetchData() {
  const newData: CollectiveData[] = []

  await Promise.all(
    selectedOrgs.value.map(async (org) => {
      try {
        const res = await fetch(`/api/transactions/${org}`)
        const result = await res.json()
        newData.push({
          name: org,
          createdAt: result.account.createdAt,
          transactions: result.transactions,
        })
      } catch (e) {
        console.error(`Error fetching data for ${org}:`, e)
      }
    }),
  )

  data.value = newData.sort((a, b) => {
    return selectedOrgs.value.indexOf(a.name) - selectedOrgs.value.indexOf(b.name)
  })
}

// Set default date range when earliest or latest date changes
watch([earliestDate], () => {
  if (earliestDate.value) {
    dateRange.value = [earliestDate.value, endOfToday]
  }
})
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
      <hr class="my-8" />
    </section>
    <section
      v-if="data.length > 0 && earliestDate && selectedEarliestDate && selectedLatestDate"
      class="w-full max-w-6xl px-4 mx-auto"
    >
      <div class="flex items-center justify-end mb-4 gap-2">
        <div class="w-80">
          <DateRangePicker v-model="dateRange" :maxStart="earliestDate" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 justify-center items-center">
        <BalanceOverTimeChart
          :data="data"
          :earliestDate="selectedEarliestDate"
          :latestDate="selectedLatestDate"
        />
        <MonthlyIncomeChart
          :data="data"
          :earliestDate="selectedEarliestDate"
          :latestDate="selectedLatestDate"
        />
        <MonthlyExpenseChart
          :data="data"
          :earliestDate="selectedEarliestDate"
          :latestDate="selectedLatestDate"
        />
      </div>
    </section>
  </div>
</template>
