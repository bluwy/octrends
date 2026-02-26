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

const dailyDates = computed(() => {
  const dates: Date[] = []
  const currentDate = new Date(props.earliestDate)
  currentDate.setUTCHours(0, 0, 0, 0)
  while (currentDate <= props.latestDate) {
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

    const createdAtDate = new Date(collective.createdAt)
    createdAtDate.setUTCHours(0, 0, 0, 0)
    let dateIndexStart = dailyDates.value.findIndex((d) => d.getTime() === createdAtDate.getTime())
    if (dateIndexStart === -1) dateIndexStart = 0

    let lastBalance = (() => {
      // Work backwards to find the last balance before first date
      const firstDate = dailyDates.value[dateIndexStart]!
      for (let txIndex = collective.transactions.length - 1; txIndex >= 0; txIndex--) {
        const tx = collective.transactions[txIndex]!
        const txDate = new Date(tx.createdAt)
        if (txDate < firstDate && tx.balanceInHostCurrency?.valueInCents) {
          return tx.balanceInHostCurrency.valueInCents / 100
        }
      }
      return 0
    })()
    let lastTxIndex = 0
    for (let dateIndex = dateIndexStart; dateIndex < dailyDates.value.length; dateIndex++) {
      // Get the last transaction balance of the date day, if there is no transaction on that day, use the last known balance
      const date = dailyDates.value[dateIndex]!
      const tmr = new Date(date.getTime() + 24 * 60 * 60 * 1000)

      for (let txIndex = lastTxIndex; txIndex < collective.transactions.length; txIndex++) {
        const tx = collective.transactions[txIndex]!
        // Is this transaction within the date day
        const txDate = new Date(tx.createdAt)
        if (date <= txDate && txDate < tmr) {
          if (tx.balanceInHostCurrency?.valueInCents) {
            lastBalance = tx.balanceInHostCurrency.valueInCents / 100
          }
          lastTxIndex = txIndex + 1
        } else if (txDate >= tmr) {
          break
        }
      }

      computedData[dateIndex]!.y[dataIndex] = lastBalance
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
    .sort((a, b) => b.value - a.value)

  return `
    <div>
      <p class="mt-0 mb-1">${chartDailyDateFormatter.format(d.x)}</p>
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
  </section>
</template>
