<script setup lang="ts">
import { computed } from 'vue'
import type { CollectiveData, Transaction } from '../utils/types'
import { chartCurrencyFormatter, getChartLegendColor } from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()

function formatCurrency(amount: number) {
  return chartCurrencyFormatter.format(amount / 100)
}

function getMonthDiff(start: Date, end: Date) {
  return end.getFullYear() * 12 + end.getMonth() - (start.getFullYear() * 12 + start.getMonth()) + 1
}

const summaries = computed(() => {
  return props.data.map((d) => {
    const txs: Transaction[] = d.transactions.filter((tx: Transaction) => {
      const date = new Date(tx.createdAt)
      return date >= props.earliestDate && date <= props.latestDate
    })

    const incomes = txs.filter((tx) => tx.type === 'CREDIT')
    const totalIncome = incomes.reduce(
      (sum, tx) => sum + (tx.amountInHostCurrency?.valueInCents || 0),
      0,
    )
    const expenses = txs.filter((tx) => tx.type === 'DEBIT')
    const totalExpense = expenses.reduce(
      (sum, tx) => sum + -(tx.amountInHostCurrency?.valueInCents || 0),
      0,
    )
    // Expense breakdown
    let expenseToUsers = 0,
      expenseToCollectives = 0,
      expenseByMiscFees = 0
    for (const tx of expenses) {
      const amount = -(tx.amountInHostCurrency?.valueInCents || 0)
      if (tx.kind === 'HOST_FEE' || tx.kind === 'PAYMENT_PROCESSOR_FEE') {
        expenseByMiscFees += amount
      } else if (tx.oppositeAccount?.type === 'COLLECTIVE') {
        expenseToCollectives += amount
      } else {
        expenseToUsers += amount
      }
    }
    // Average monthly budget
    const months = getMonthDiff(props.earliestDate, props.latestDate)
    const averageBudget = months > 0 ? totalIncome / months : 0
    return {
      name: d.name,
      totalIncome,
      averageBudget,
      totalExpense,
      expenseToUsers,
      expenseToCollectives,
      expenseByMiscFees,
    }
  })
})
</script>

<template>
  <div class="mt-8 mb-16">
    <h3 class="text-xl font-400 m-0">In this period...</h3>
    <p v-for="(s, i) in summaries" :key="s.name" class="text-lg mb-4 text-gray-300">
      <strong :style="{ color: getChartLegendColor(i) }">{{ s.name }}</strong> has raised
      <strong class="text-green-200">{{ formatCurrency(s.totalIncome) }}</strong> with an average
      monthly budget of <strong class="text-green-200">{{ formatCurrency(s.averageBudget) }}</strong
      >. A total of <strong class="text-red-200">{{ formatCurrency(s.totalExpense) }}</strong> is
      disbursed to users,
      <strong class="text-red-200">{{ formatCurrency(s.expenseToCollectives) }}</strong> is
      disbursed to other collectives, and
      <strong class="text-red-200">{{ formatCurrency(s.expenseByMiscFees) }}</strong> is spent on
      host and payment processor fees.
    </p>
  </div>
</template>

<style scoped>
strong {
  font-size: 1.5rem;
  font-weight: 500;
}
</style>
