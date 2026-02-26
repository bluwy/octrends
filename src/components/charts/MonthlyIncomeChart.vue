<script setup lang="ts">
import { type BulletLegendItemInterface, Scale } from '@unovis/ts'
import {
  VisXYContainer,
  VisGroupedBar,
  VisAxis,
  VisTooltip,
  VisCrosshair,
  VisBulletLegend,
} from '@unovis/vue'
import type { CollectiveData } from '../../utils/types'
import { computed } from 'vue'
import {
  chartCurrencyFormatter,
  chartLegendColors,
  chartMonthlyDateFormatter,
} from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()

interface DataPoint {
  x: Date
  y: (number | undefined)[]
}

const monthlyDates = computed(() => {
  const dates: Date[] = []
  const currentDate = new Date(props.earliestDate)
  currentDate.setUTCHours(0, 0, 0, 0)
  currentDate.setUTCDate(1)
  while (currentDate <= props.latestDate) {
    dates.push(new Date(currentDate))
    currentDate.setUTCMonth(currentDate.getUTCMonth() + 1)
  }
  return dates
})

const data = computed<DataPoint[]>(() => {
  const computedData = monthlyDates.value.map<DataPoint>((date) => ({
    x: date,
    y: props.data.map(() => undefined),
  }))

  for (let dataIndex = 0; dataIndex < props.data.length; dataIndex++) {
    const collective = props.data[dataIndex]!
    if (collective.transactions.length === 0) continue

    const createdAtDate = new Date(collective.transactions[0]!.createdAt)
    createdAtDate.setUTCHours(0, 0, 0, 0)
    createdAtDate.setUTCDate(1)
    let dateIndexStart = monthlyDates.value.findIndex(
      (d) => d.getTime() === createdAtDate.getTime(),
    )
    if (dateIndexStart === -1) dateIndexStart = 0

    let lastTxIndex = 0
    for (let dateIndex = dateIndexStart; dateIndex < monthlyDates.value.length; dateIndex++) {
      // Collect all income transactions within this month
      const date = monthlyDates.value[dateIndex]!

      let total = 0
      for (let txIndex = lastTxIndex; txIndex < collective.transactions.length; txIndex++) {
        const tx = collective.transactions[txIndex]!
        // Is this transaction within the date month
        const txDate = new Date(tx.createdAt)
        const nextMonth = new Date(date.getTime())
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
        if (date <= txDate && txDate < nextMonth) {
          const amount = tx.amountInHostCurrency?.valueInCents ?? 0
          if (amount > 0) {
            total += amount / 100
          }
          lastTxIndex = txIndex + 1
        }
      }

      computedData[dateIndex]!.y[dataIndex] = total
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
  const items = props.data
    .map((collective, index) => {
      const value = d.y[index]
      if (value === undefined) return null
      return {
        name: collective.name,
        value,
        color: chartLegendColors[index % chartLegendColors.length],
      }
    })
    .filter((v) => v !== null)

  return `
    <div>
      <p class="mt-0 mb-1">${chartMonthlyDateFormatter.format(d.x)}</p>
      <ul class="p-0 m-0">
        ${items
          .map(
            (item) => `
              <li class="text-sm flex items-center gap-1">
                <span class="inline-block rounded-full w-2 h-2" style="background-color: ${item.color}"></span>
                ${item!.name}: ${chartCurrencyFormatter.format(item!.value)}
              </li>
            `,
          )
          .join('')}
      </ul>
    </div>
  `
}
</script>

<template>
  <section class="w-full max-w-xl mx-auto">
    <h3 class="text-xl font-400 m-0">Monthly income</h3>
    <VisBulletLegend class="text-center mb-2" :items="legends" />
    <VisXYContainer :data="data" :xScale="Scale.scaleTime()">
      <VisGroupedBar
        :data="data"
        :x="(d: DataPoint) => +d.x"
        :y="Array.from({ length: props.data.length }, (_, i) => (d: DataPoint) => d.y[i])"
        :groupPadding="0.5"
        :barMinHeight="0"
      />
      <VisAxis
        type="x"
        :tickFormat="(x: number) => chartMonthlyDateFormatter.format(x)"
        :numTicks="4"
      />
      <VisAxis type="y" :tickFormat="(y: number) => chartCurrencyFormatter.format(y)" />
      <VisCrosshair :template="tooltipTemplate" />
      <VisTooltip />
    </VisXYContainer>
  </section>
</template>
