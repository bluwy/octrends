<script setup lang="ts">
import MonthlyIncomeChart from '../charts/MonthlyIncomeChart.vue'
import type { CollectiveData } from '../../utils/types'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div class="my-8">
    <h3 class="text-xl font-400 m-0">Income</h3>
    <div class="flex justify-between gap-8">
      <div class="flex-1">
        <MonthlyIncomeChart
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
      <div class="flex-1">
        <!-- Reserved for future: Last balances or summary -->
      </div>
    </div>
  </div>
</template>
