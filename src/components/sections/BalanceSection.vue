<script setup lang="ts">
import { computed } from 'vue'
import BalanceOverTimeChart from '../charts/BalanceOverTimeChart.vue'
import type { CollectiveData } from '../../utils/types'
import { chartCurrencyFormatter } from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()

const lastBalances = computed(() => {
  return props.data.map((collective) => {
    const lastTx = collective.transactions[collective.transactions.length - 1]
    const balance = lastTx?.balanceInHostCurrency?.valueInCents ?? 0
    return {
      name: collective.name,
      balance: chartCurrencyFormatter.format(balance / 100),
    }
  })
})
</script>

<template>
  <div>
    <h3 class="text-xl font-400 m-0">Balance</h3>
    <div class="flex justify-between gap-2">
      <div class="flex-grow">
        <table class="my-2">
          <tbody>
            <tr v-for="b in lastBalances" :key="b.name">
              <td class="align-top opacity-80 p-0 pr-4">{{ b.name }}</td>
              <td class="text-2xl font-200 leading-6 p-0 pb-4">{{ b.balance }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <BalanceOverTimeChart
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
    </div>
  </div>
</template>
