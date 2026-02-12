<script setup lang="ts">
import { type BulletLegendItemInterface, Scale } from '@unovis/ts'
import {
  VisXYContainer,
  VisLine,
  VisAxis,
  VisTooltip,
  VisCrosshair,
  VisBulletLegend,
} from '@unovis/vue'
import type { CollectiveData } from '../../utils/types'
import { computed } from 'vue'
import {
  chartCurrencyFormatter,
  chartDailyDateFormatter,
  chartMonthlyDateFormatter,
} from '../../utils/common'
import { getEarliestDate, getLatestDate } from '../../utils/data'

const props = defineProps<{
  data: CollectiveData[]
}>()

interface DataPoint {
  x: Date
  y: (number | undefined)[]
}

const earliestDate = computed(() => getEarliestDate(props.data))
const latestDate = computed(() => getLatestDate(props.data))

const dailyDates = computed(() => {
  if (!earliestDate.value || !latestDate.value) {
    return []
  }
  const dates: Date[] = []
  const currentDate = new Date(earliestDate.value)
  currentDate.setUTCHours(0, 0, 0, 0)
  while (currentDate <= latestDate.value) {
    dates.push(new Date(currentDate))
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }
  return dates
})

const data = computed<DataPoint[]>(() => {
  const computedData = dailyDates.value.map<DataPoint>((date) => ({
    x: date,
    y: props.data.map(() => undefined),
  }))

  for (let dataIndex = 0; dataIndex < props.data.length; dataIndex++) {
    const collective = props.data[dataIndex]!
    if (collective.transactions.length === 0) continue

    const firstTxDate = new Date(collective.transactions[0]!.createdAt)
    firstTxDate.setUTCHours(0, 0, 0, 0)
    const dateIndexStart = dailyDates.value.findIndex((d) => d.getTime() === firstTxDate.getTime())

    let lastBalance = 0
    let lastTxIndex = 0
    for (let dateIndex = dateIndexStart; dateIndex < dailyDates.value.length; dateIndex++) {
      // Get the last transaction balance of the date day, if there is no transaction on that day, use the last known balance
      const date = dailyDates.value[dateIndex]!

      for (let txIndex = lastTxIndex; txIndex < collective.transactions.length; txIndex++) {
        const tx = collective.transactions[txIndex]!
        // Is this transaction within the date day
        const txDate = new Date(tx.createdAt)
        if (date < txDate && txDate < new Date(date.getTime() + 24 * 60 * 60 * 1000)) {
          if (tx.balanceInHostCurrency?.valueInCents) {
            lastBalance = tx.balanceInHostCurrency.valueInCents / 100
          }
          lastTxIndex = txIndex + 1
        }
      }

      computedData[dateIndex]!.y[dataIndex] = lastBalance
    }

    for (const tx of collective.transactions) {
      const txDate = new Date(tx.createdAt)
      txDate.setUTCHours(0, 0, 0, 0)

      const computedDataIndex = dailyDates.value.findIndex((d) => d.getTime() === txDate.getTime())
      const balance = tx.balanceInHostCurrency?.valueInCents
        ? tx.balanceInHostCurrency.valueInCents / 100
        : lastBalance
      lastBalance = balance
      computedData[computedDataIndex]!.y[dataIndex] = lastBalance
    }
  }

  return computedData
})

const legends = computed<BulletLegendItemInterface[]>(() => {
  return props.data.map((collective) => ({
    name: collective.name,
  }))
})

function tooltipTemplate(d: DataPoint) {
  return `${chartDailyDateFormatter.format(d.x)}: ${d.y
    .filter(Boolean)
    .sort()
    .map((y) => chartCurrencyFormatter.format(y!))
    .join(', ')}`
}
</script>

<template>
  <h3 class="text-xl font-400 m-0">Balance over time</h3>
  <VisBulletLegend class="text-center mb-2" :items="legends" />
  <VisXYContainer :data="data" :xScale="Scale.scaleTime()">
    <VisLine
      :data="data"
      :x="(d: DataPoint) => +d.x"
      :y="Array.from({ length: props.data.length }, (_, i) => (d: DataPoint) => d.y[i])"
    />
    <VisAxis type="x" :tickFormat="(x: number) => chartMonthlyDateFormatter.format(x)" />
    <VisAxis type="y" :tickFormat="(y: number) => chartCurrencyFormatter.format(y)" />
    <VisCrosshair :template="tooltipTemplate" />
    <VisTooltip />
  </VisXYContainer>
</template>
