<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IncomeSection from './components/sections/IncomeSection.vue'
import ExpenseSection from './components/sections/ExpenseSection.vue'
import DateRangePicker from './components/DateRangePicker.vue'
import SearchInput from './components/SearchInput.vue'
import Card from './components/Card.vue'
import githubIcon from './assets/github.svg'
import { endOfToday, getEarliestDate } from './utils/date'
import type { CollectiveData } from './utils/types'
import BalanceSection from './components/sections/BalanceSection.vue'

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
        // Both endpoints have different cache duration, so separated
        const [accountRes, transactionsRes] = await Promise.all([
          fetch(`/api/account/${org}`),
          fetch(`/api/transactions/${org}`),
        ])
        const accountResult = await accountRes.json()
        const transactionsResult = await transactionsRes.json()
        newData.push({
          name: org,
          account: accountResult.account,
          transactions: transactionsResult.transactions,
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
      <div class="flex flex-wrap gap-4 my-4">
        <Card
          v-for="d in data"
          :key="d.name"
          :account="d.account"
          @close="selectedOrgs.splice(selectedOrgs.indexOf(d.name), 1)"
        />
      </div>
      <hr class="my-8" />
    </section>
    <section
      v-if="data.length > 0 && earliestDate && selectedEarliestDate && selectedLatestDate"
      class="w-full max-w-6xl px-4 mx-auto"
    >
      <div class="flex items-center justify-end mb-4 gap-2">
        <DateRangePicker v-model="dateRange" :minDate="earliestDate" />
      </div>
      <BalanceSection
        :data="data"
        :earliestDate="selectedEarliestDate"
        :latestDate="selectedLatestDate"
      />
      <IncomeSection
        :data="data"
        :earliestDate="selectedEarliestDate"
        :latestDate="selectedLatestDate"
      />
      <ExpenseSection
        :data="data"
        :earliestDate="selectedEarliestDate"
        :latestDate="selectedLatestDate"
      />
    </section>
  </div>
</template>
