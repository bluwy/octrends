<script setup lang="ts">
import BalanceOverTimeChart from '../charts/BalanceOverTimeChart.vue'
import LastBalanceTable from '../tables/LastBalanceTable.vue'
import type { CollectiveData } from '../../utils/types'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div class="mt-8 mb-16">
    <h3 class="text-xl font-400 m-0 pt-4 border-t-solid border-t-2 border-gray-700">Balance</h3>
    <div class="flex flex-col lg:flex-row justify-between gap-8">
      <div class="flex-1">
        <BalanceOverTimeChart
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
      <div class="flex-1">
        <LastBalanceTable :data="props.data" :latestDate="props.latestDate" />
      </div>
    </div>
  </div>
</template>
