<script setup lang="ts">
import MonthlyIncomeChart from '../charts/MonthlyIncomeChart.vue'
import type { CollectiveData } from '../../utils/types'
import TopIncomeSourcesTable from '../tables/TopIncomeSourcesTable.vue'
import TotalIncomeTable from '../tables/TotalIncomeTable.vue'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div class="mt-8 mb-16">
    <h3 class="text-xl font-400 m-0 pt-2 border-t-solid border-t-2 border-gray-700">Income</h3>
    <div class="flex flex-col lg:flex-row justify-between gap-8">
      <div class="flex-1">
        <MonthlyIncomeChart
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
      <div class="flex-1">
        <TotalIncomeTable
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
        <TopIncomeSourcesTable
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
    </div>
  </div>
</template>
