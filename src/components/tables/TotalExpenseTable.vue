<script setup lang="ts">
import { computed } from 'vue'
import type { CollectiveData } from '../../utils/types'
import { chartCurrencyFormatter, getChartLegendColor } from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()

const collectiveExpenses = computed(() => {
  return props.data.map((collective) => {
    let total = 0
    for (const transaction of collective.transactions) {
      if (
        transaction.type === 'DEBIT' &&
        !transaction.isRefund &&
        new Date(transaction.createdAt) >= props.earliestDate &&
        new Date(transaction.createdAt) <= props.latestDate
      ) {
        total += -(transaction.amountInHostCurrency?.valueInCents || 0)
      }
    }
    return {
      name: collective.name,
      total: chartCurrencyFormatter.format(total / 100),
    }
  })
})
</script>

<template>
  <div>
    <h4 class="text-lg font-400 m-0">Total expenses in period</h4>
    <table class="my-2">
      <tbody>
        <tr v-for="(c, i) in collectiveExpenses" :key="c.name">
          <td class="align-top p-0 pr-4" :style="{ color: getChartLegendColor(i) }">
            {{ c.name }}
          </td>
          <td class="text-2xl font-200 leading-6 p-0 pb-4">
            {{ c.total }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
