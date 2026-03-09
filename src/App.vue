<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SummarySection from './components/sections/SummarySection.vue'
import BalanceSection from './components/sections/BalanceSection.vue'
import IncomeSection from './components/sections/IncomeSection.vue'
import ExpenseSection from './components/sections/ExpenseSection.vue'
import DateRangePicker from './components/DateRangePicker.vue'
import SearchInput from './components/SearchInput.vue'
import Card from './components/Card.vue'
import githubIcon from './assets/github.svg'
import { getChartLegendColor } from './utils/common'
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

watch([selectedOrgs], fetchData, { immediate: true })
async function fetchData() {
  const orgs = selectedOrgs.value
  const newData: CollectiveData[] = []

  await Promise.all(
    orgs.map(async (org) => {
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
    return orgs.indexOf(a.name) - orgs.indexOf(b.name)
  })
}

// Set default date range when earliest or latest date changes
watch([earliestDate], () => {
  if (earliestDate.value) {
    dateRange.value = [earliestDate.value, endOfToday]
  }
})

function setOrgs(orgs: string[]) {
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
        <p v-show="selectedOrgs.length !== data.length" class="m-0 opacity-60 text-sm italic">
          Loading collective data
          <span class="inline-block align-bottom i-svg-spinners:3-dots-fade"></span>
        </p>
      </div>
      <div v-show="data.length > 0" class="flex flex-wrap gap-4 mt-6 mb-4">
        <Card
          v-for="d in data"
          :key="d.name"
          :account="d.account"
          @close="() => removeOrg(d.name)"
        />
      </div>
      <hr v-if="data.length > 0" class="fade-lines border-white my-8" />
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
      <div class="flex items-center justify-between mb-4 gap-2">
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

<style scoped>
hr.fade-lines {
  position: relative;
  overflow: visible;
  border: none;
  height: 2px;
  background: #cacaca;
}

hr.fade-lines::before,
hr.fade-lines::after {
  content: '';
  position: absolute;
  top: 0px;
  height: 2px;
  width: 4rem;
}

hr.fade-lines::before {
  right: 100%;
  background: linear-gradient(to right, transparent, #cacaca 90%);
}

hr.fade-lines::after {
  left: 100%;
  background: linear-gradient(to left, transparent, #cacaca 90%);
}
</style>
