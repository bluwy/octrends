<script setup lang="ts">
import { computed } from 'vue'
import type { CollectiveData } from '../../utils/types'
import { chartCurrencyFormatter, dateOnlyFormatter, getChartLegendColor } from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  latestDate: Date
}>()

const lastBalances = computed(() => {
  return props.data.map((collective) => {
    let balance = 0
    for (let i = collective.transactions.length - 1; i >= 0; i--) {
      const tx = collective.transactions[i]!
      if (new Date(tx.createdAt) <= props.latestDate) {
        balance = tx.balanceInHostCurrency?.valueInCents ?? 0
        break
      }
    }
    return {
      name: collective.name,
      balance: chartCurrencyFormatter.format(balance / 100),
    }
  })
})
</script>

<template>
  <div>
    <h4 class="text-lg font-400 m-0">
      Last balance on {{ dateOnlyFormatter.format(props.latestDate) }}
    </h4>
    <table class="my-2">
      <tbody>
        <tr v-for="(b, i) in lastBalances" :key="b.name">
          <td class="align-top p-0 pr-4" :style="{ color: getChartLegendColor(i) }">
            {{ b.name }}
          </td>
          <td class="text-2xl font-200 leading-6 p-0 pb-4">{{ b.balance }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
