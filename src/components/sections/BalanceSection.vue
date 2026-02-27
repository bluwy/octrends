<script setup lang="ts">
import BalanceOverTimeChart from '../charts/BalanceOverTimeChart.vue'
import LastBalanceTable from '../tables/LastBalanceTable.vue'
import type { CollectiveData } from '../../utils/types'
import { dateOnlyFormatter } from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()
</script>

<template>
  <div>
    <h3 class="text-xl font-400 m-0">Balance</h3>
    <div class="flex justify-between gap-8">
      <div class="flex-1">
        <BalanceOverTimeChart
          :data="props.data"
          :earliestDate="props.earliestDate"
          :latestDate="props.latestDate"
        />
      </div>
      <div class="flex-1">
        <h4 class="text-lg font-400 m-0">
          Last balance on {{ dateOnlyFormatter.format(props.latestDate) }}
        </h4>
        <LastBalanceTable :data="props.data" :latestDate="props.latestDate" />
      </div>
    </div>
  </div>
</template>
