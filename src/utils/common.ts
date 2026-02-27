import { colorsDark } from '@unovis/ts'

export const chartCurrencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
})

export const chartMonthlyDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  year: 'numeric',
})

export const chartDailyDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export const chartLegendColors = colorsDark

export function debounce(fn: Function, wait: number) {
  let t: number
  return function () {
    clearTimeout(t)
    // @ts-expect-error
    t = setTimeout(() => fn.apply(this, arguments), wait)
  }
}
