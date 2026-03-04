<script setup lang="ts">
import MonthlyExpenseChart from '../charts/MonthlyExpenseChart.vue'
import type { CollectiveData } from '../../utils/types'
import TopExpenseSourcesTable from '../tables/TopExpenseSourcesTable.vue'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div class="my-8">
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
        <TopExpenseSourcesTable
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
    </div>
  </div>
</template>
