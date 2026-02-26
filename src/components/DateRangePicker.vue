<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { endOfToday, startOfDay } from '../utils/date'

const range = defineModel<[Date, Date]>()
const props = defineProps<{
  maxStart: Date
}>()

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})
function formatDate(date: Date | Date[]) {
  if (Array.isArray(date)) {
    return `${dateFormatter.format(date[0])} - ${dateFormatter.format(date[1])}`
  }
  return dateFormatter.format(date)
}

const today = new Date(endOfToday)

const presets = [
  {
    label: 'Last week',
    value: [
      startOfDay(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)), //
      today,
    ],
  },
  {
    label: 'Last month',
    value: [
      startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())),
      today,
    ],
  },
  {
    label: 'Last 6 months',
    value: [
      startOfDay(new Date(today.getFullYear(), today.getMonth() - 5, 1)), //
      today,
    ],
  },
  {
    label: 'Last year',
    value: [startOfDay(new Date(today.getFullYear() - 1, today.getMonth() + 1, 1)), today],
  },
]
</script>

<template>
  <VueDatePicker
    v-model="range"
    range
    dark
    auto-apply
    :time-config="{ enableTimePicker: false }"
    :formats="{
      input: formatDate,
      preview: formatDate,
    }"
    :preset-dates="presets"
    :min-date="props.maxStart"
    :max-date="today"
  />
</template>
