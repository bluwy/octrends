<script setup lang="ts">
import MonthlyExpenseChart from '../charts/MonthlyExpenseChart.vue'
import type { CollectiveData } from '../../utils/types'
import TopExpenseSourcesTable from '../tables/TopExpenseSourcesTable.vue'

import TotalExpenseTable from '../tables/TotalExpenseTable.vue'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div class="mt-8 mb-16">
    <h3 class="text-xl font-400 m-0 pt-2 border-t-solid border-t-2 border-gray-700">Expenses</h3>
    <div class="flex flex-col lg:flex-row justify-between gap-8">
      <div class="flex-1">
        <MonthlyExpenseChart
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
      <div class="flex-1">
        <TotalExpenseTable
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
        <TopExpenseSourcesTable
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
    </div>
  </div>
</template>
