<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { endOfToday, startOfDay } from '../utils/date'
import { dateOnlyFormatter } from '../utils/common'

const range = defineModel<[Date, Date]>()
const props = defineProps<{
  minDate: Date
}>()

const today = new Date(endOfToday)

const presets = computed(() => [
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
    value: [
      startOfDay(new Date(today.getFullYear() - 1, today.getMonth() + 1, 1)), //
      today,
    ],
  },
  {
    label: 'All time',
    value: [props.minDate, today],
  },
])

const label = computed(() => {
  const preset = presets.value.find(
    (p) =>
      p.value.length === 2 &&
      p.value[0]!.getTime() === range.value?.[0]?.getTime() &&
      p.value[1]!.getTime() === range.value?.[1]?.getTime(),
  )
  return preset ? preset.label : ''
})

function formatDate(date: Date | Date[]) {
  if (Array.isArray(date)) {
    return `${dateOnlyFormatter.format(date[0])} - ${dateOnlyFormatter.format(date[1])}`
  }
  return dateOnlyFormatter.format(date)
}
</script>

<template>
  <div class="flex items-center gap-4">
    <span class="opacity-80">{{ label }}</span>
    <div class="w-70">
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
        :min-date="props.minDate"
        :max-date="today"
      />
    </div>
  </div>
</template>
