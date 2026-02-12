export const chartCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
})

export const chartMonthlyDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

export const chartDailyDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function debounce(fn: Function, wait: number) {
  let t: number
  return function () {
    clearTimeout(t)
    // @ts-expect-error
    t = setTimeout(() => fn.apply(this, arguments), wait)
  }
}
