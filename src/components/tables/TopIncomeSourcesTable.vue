<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CollectiveData } from '../../utils/types'
import { chartCurrencyFormatter, getChartLegendColor } from '../../utils/common'
import InlineSelect from '../InlineSelect.vue'
import RowCountSelect from '../RowCountSelect.vue'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()

const choices = computed(() => [
  { label: 'All Collectives', value: 'all' },
  ...props.data.map((d) => ({ label: d.name, value: d.name })),
])
const choice = ref('all')

const filteredIncome = computed(() => {
  const incomes = []
  for (let i = 0; i < props.data.length; i++) {
    const collective = props.data[i]!
    if (choice.value !== 'all' && collective.name !== choice.value) {
      continue
    }
    for (const transaction of collective.transactions) {
      if (
        transaction.type === 'CREDIT' &&
        !transaction.isRefund &&
        new Date(transaction.createdAt) >= props.earliestDate &&
        new Date(transaction.createdAt) <= props.latestDate
      ) {
        incomes.push({ color: getChartLegendColor(i), transaction })
      }
    }
  }
  return incomes
})

const rowCount = ref(10)

const topSources = computed(() => {
  const sourcesMap: Record<
    string,
    { key: string; color: string; name: string; slug?: string; total: number }
  > = {}
  filteredIncome.value.forEach((t) => {
    const oppositeAccount = t.transaction.oppositeAccount
    if (oppositeAccount == null) return

    const id = oppositeAccount.id
    const amount = t.transaction.amountInHostCurrency?.valueInCents || 0
    const key = `${id}-${t.color}`
    if (!sourcesMap[key]) {
      const name = oppositeAccount.name || 'Unknown'
      // VENDOR no slug: 11004-sovereign-tech-fund-2532c0cc
      const slug = oppositeAccount.type === 'VENDOR' ? undefined : oppositeAccount.slug
      sourcesMap[key] = { key, color: t.color, name, slug, total: 0 }
    }
    if (oppositeAccount.slug === 'sapphi-red') {
      console.log(t.transaction)
    }
    sourcesMap[key].total += amount
  })
  return Object.values(sourcesMap).sort((a, b) => b.total - a.total)
})

const topSourcesList = computed(() => {
  if (rowCount.value === Infinity) return topSources.value
  return topSources.value.slice(0, rowCount.value)
})
</script>

<template>
  <div>
    <h4 class="text-lg font-500 mb-2 flex items-center justify-between gap-2">
      <span>
        Top Income Sources in
        <InlineSelect v-model="choice" :options="choices" />
      </span>
      <RowCountSelect v-model="rowCount" />
    </h4>
    <table class="w-full gap-2">
      <tbody>
        <tr v-for="source in topSourcesList" :key="source.name">
          <td class="p-0 pr-1 pb-1">
            <a
              v-if="source.slug"
              :href="`https://opencollective.com/${source.slug}`"
              target="_blank"
              rel="noopener noreferrer"
              class="no-underline"
              :style="{ color: source.color }"
            >
              {{ source.name }}
            </a>
            <span v-else :style="{ color: source.color }">
              {{ source.name }}
            </span>
          </td>
          <td class="text-right">
            {{ chartCurrencyFormatter.format(source.total / 100) }}
          </td>
        </tr>
        <tr v-if="topSources.length === 0">
          <td colspan="3" class="text-center text-gray-500 py-2">No income sources found</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
