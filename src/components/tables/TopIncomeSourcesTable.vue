<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CollectiveData } from '../../utils/types'
import { chartCurrencyFormatter, getChartLegendColor } from '../../utils/common'
import InlineSelect from '../InlineSelect.vue'

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
        new Date(transaction.createdAt) >= props.earliestDate &&
        new Date(transaction.createdAt) <= props.latestDate
      ) {
        incomes.push({ color: getChartLegendColor(i), transaction })
      }
    }
  }
  return incomes
})

const topSources = computed(() => {
  const sourcesMap: Record<string, { color: string; name: string; slug: string; total: number }> =
    {}
  filteredIncome.value.forEach((t) => {
    const name = t.transaction.oppositeAccount?.name || 'Unknown'
    const slug = t.transaction.oppositeAccount?.slug || ''
    const amount = t.transaction.amountInHostCurrency?.valueInCents || 0
    const key = `${name}-${t.color}`
    if (!sourcesMap[key]) {
      sourcesMap[key] = { color: t.color, name, slug, total: 0 }
    }
    sourcesMap[key].total += amount
  })
  return Object.values(sourcesMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10) // top 10
})
</script>

<template>
  <div>
    <h4 class="text-lg font-500 mb-2">
      Top Income Sources in
      <InlineSelect v-model="choice" :options="choices" />
    </h4>
    <table class="w-full gap-2">
      <tbody>
        <tr v-for="source in topSources" :key="source.name">
          <td class="p-0 pr-1 pb-1">
            <a
              :href="`https://opencollective.com/${source.slug}`"
              target="_blank"
              rel="noopener noreferrer"
              class="no-underline"
              :style="{ color: source.color }"
            >
              {{ source.name }}
            </a>
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
