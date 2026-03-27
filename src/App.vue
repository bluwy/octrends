<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SummarySection from './components/sections/SummarySection.vue'
import BalanceSection from './components/sections/BalanceSection.vue'
import IncomeSection from './components/sections/IncomeSection.vue'
import ExpenseSection from './components/sections/ExpenseSection.vue'
import DateRangePicker from './components/DateRangePicker.vue'
import SearchInput from './components/SearchInput.vue'
import Card from './components/Card.vue'
import LoadingText from './components/LoadingText.vue'
import githubIcon from './assets/github.svg'
import { getChartLegendColor } from './utils/common'
import { fetchCollectiveData } from './utils/data'
import { endOfToday, getEarliestDate } from './utils/date'
import type { CollectiveData } from './utils/types'
import { suggestedCollectives } from './utils/constants'
import { useUrl } from './utils/useUrl'

const url = useUrl()

const hasPathnameInitially = url.value.pathname.length > 1

// "/org1-vs-org2" => ["org1", "org2"]
const selectedOrgs = computed<string[]>(() => {
  const path = url.value.pathname.replace(/^\//, '')
  if (!path) return []
  return path.split('-vs-').filter(Boolean)
})

const data = ref<CollectiveData[]>([])
const fetchDataState = ref<'idle' | 'fetching' | 'error'>('idle')
const failedOrgs = ref<string[]>([])

const dateRange = ref<[Date, Date]>()
const earliestDate = computed(() => getEarliestDate(data.value))
const selectedEarliestDate = computed(() =>
  dateRange.value ? dateRange.value[0] : earliestDate.value,
)
const selectedLatestDate = computed(() => (dateRange.value ? dateRange.value[1] : endOfToday))

const vsColoredHtml = computed(() => {
  if (data.value.length === 0) return ''
  let str = ''
  for (let i = 0; i < data.value.length; i++) {
    const d = data.value[i]!
    str += `<span style=\"color: ${getChartLegendColor(i)}\">${d.name}</span>`
    if (i < data.value.length - 1) {
      str += ' vs '
    }
  }
  return str
})

// Get two random collectives as suggestions
const randomSuggestedCollectives = suggestedCollectives.sort(() => 0.5 - Math.random()).slice(0, 2)

watch(
  [selectedOrgs],
  async () => {
    fetchDataState.value = 'fetching'
    const orgs = selectedOrgs.value
    try {
      data.value = await Promise.all(
        orgs.map(async (org) => {
          try {
            return await fetchCollectiveData(org)
          } catch (e) {
            failedOrgs.value.push(org)
            throw new Error(`Error fetching data for ${org}`, { cause: e })
          }
        }),
      )
      fetchDataState.value = 'idle'
    } catch (error) {
      fetchDataState.value = 'error'
      console.log('Error fetching data:', error)
    }
  },
  { immediate: true },
)

// Set default date range when earliest or latest date changes
watch([earliestDate], () => {
  if (earliestDate.value) {
    dateRange.value = [earliestDate.value, endOfToday]
  }
})

function setOrgs(orgs: string[]) {
  orgs = orgs.filter((o) => !failedOrgs.value.includes(o))
  const path = orgs.length ? '/' + orgs.join('-vs-') : '/'
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
  }
}

function addOrg(org: string) {
  const orgs = selectedOrgs.value.slice()
  if (!orgs.includes(org)) {
    orgs.push(org)
    setOrgs(orgs)
  }
}

function removeOrg(org: string) {
  const orgs = selectedOrgs.value.filter((o) => o !== org)
  setOrgs(orgs)
}
</script>

<template>
  <div>
    <section class="w-full max-w-6xl px-4 mt-4 mx-auto">
      <div class="flex items-center justify-between my-2">
        <h1 class="text-2xl font-500 m-0">Open Collective Trends</h1>
        <a
          class="flex items-center gap-3 text-gray-100 decoration-none hover:underline focus:underline"
          href="https://github.com/bluwy/octrends"
        >
          <span class="hidden sm:inline">Star on GitHub</span>
          <img :src="githubIcon" alt="GitHub" class="w-5 h-5" />
        </a>
      </div>
      <p class="opacity-60 mt-4 mb-2">Analyze and compare collective funding</p>
      <div class="flex items-center gap-4">
        <SearchInput @submit="(v) => addOrg(v)" />
        <LoadingText v-if="fetchDataState === 'fetching'" />
        <span class="m-0 text-red-400 text-sm italic" v-else-if="fetchDataState === 'error'">
          Failed to fetch data. Is the collective slug correct?
        </span>
      </div>
      <div v-show="data.length > 0" class="flex flex-wrap gap-4 mt-6 mb-4">
        <Card
          v-for="d in data"
          :key="d.name"
          :account="d.account"
          @close="() => removeOrg(d.name)"
        />
      </div>
      <hr v-if="data.length > 0" class="border-white my-8" />
      <p v-else-if="!hasPathnameInitially" class="my-6">
        Add a collective to get started. For example,
        <template v-for="(c, i) in randomSuggestedCollectives" :key="c">
          <button
            class="bg-transparent border-none p-0 m-0 font-size-inherit text-inherit underline cursor-pointer hover:underline focus:underline"
            @click="() => addOrg(c)"
          >
            {{ c }}
          </button>
          <span v-if="i < randomSuggestedCollectives.length - 1"> or </span></template
        >.
      </p>
    </section>
    <section
      v-if="data.length > 0 && earliestDate && selectedEarliestDate && selectedLatestDate"
      class="w-full max-w-6xl px-4 mx-auto"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 class="text-xl font-500 m-0" v-html="vsColoredHtml"></h2>
        <DateRangePicker v-model="dateRange" :minDate="earliestDate" />
      </div>
      <SummarySection
        :data="data"
        :earliestDate="selectedEarliestDate"
        :latestDate="selectedLatestDate"
      />
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
