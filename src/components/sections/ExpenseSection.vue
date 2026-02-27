<script setup lang="ts">
import MonthlyExpenseChart from '../charts/MonthlyExpenseChart.vue'
import type { CollectiveData } from '../../utils/types'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div>
    <h3 class="text-xl font-400 m-0">Expenses</h3>
    <div class="flex justify-between gap-8">
      <div class="flex-1">
        <MonthlyExpenseChart
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
