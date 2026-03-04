<script setup lang="ts">
import { computed } from 'vue'
import type { CollectiveData, Transaction } from '../../utils/types'
import { chartCurrencyFormatter, getChartLegendColor } from '../../utils/common'

const props = defineProps<{
  data: CollectiveData[]
  earliestDate: Date
  latestDate: Date
}>()

function formatCurrency(amount: number) {
  return chartCurrencyFormatter.format(amount / 100)
}

function formatPercentage(percentage: number) {
  if (percentage === 0) return '0%'
  let v = percentage.toFixed()
  if (v === '0') v = percentage.toFixed(1)
  if (v === '0.0') v = percentage.toFixed(2)
  return `${v}%`
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
    let expenseToMaintainers = 0,
      expenseToUsers = 0,
      expenseToCollectives = 0,
      expenseByMiscFees = 0
    for (const tx of expenses) {
      const amount = -(tx.amountInHostCurrency?.valueInCents || 0)
      if (tx.kind === 'HOST_FEE' || tx.kind === 'PAYMENT_PROCESSOR_FEE') {
        expenseByMiscFees += amount
      } else if (tx.oppositeAccount?.type === 'COLLECTIVE') {
        expenseToCollectives += amount
      } else {
        const expenseAccountId = tx.oppositeAccount?.id
        const isMaintainer =
          expenseAccountId &&
          d.account.members.nodes?.some((m) => m?.account?.id === expenseAccountId)
        if (isMaintainer) {
          expenseToMaintainers += amount
        } else {
          expenseToUsers += amount
        }
      }
    }
    // Average monthly budget
    const months = getMonthDiff(props.earliestDate, props.latestDate)
    const averageBudget = months > 0 ? totalIncome / months : 0
    return {
      name: d.name,
      totalIncome,
      averageBudget,
      totalExpense: {
        value: totalExpense,
        percentage: (totalExpense / totalIncome) * 100,
      },
      expenseToMaintainers: {
        value: expenseToMaintainers,
        percentage: (expenseToMaintainers / totalIncome) * 100,
      },
      expenseToUsers: {
        value: expenseToUsers,
        percentage: (expenseToUsers / totalIncome) * 100,
      },
      expenseToCollectives: {
        value: expenseToCollectives,
        percentage: (expenseToCollectives / totalIncome) * 100,
      },
      expenseByMiscFees: {
        value: expenseByMiscFees,
        percentage: (expenseByMiscFees / totalIncome) * 100,
      },
    }
  })
})
</script>

<template>
  <div class="mt-8 mb-16">
    <h3 class="text-xl font-400 m-0">In this period...</h3>
    <template v-for="(s, i) in summaries" :key="s.name">
      <p class="text-lg mb-2 text-gray-300">
        <strong :style="{ color: getChartLegendColor(i) }">{{ s.name }}</strong> has raised
        <strong class="text-green-200">{{ formatCurrency(s.totalIncome) }}</strong> (average
        <strong class="text-green-200">{{ formatCurrency(s.averageBudget) }}</strong> per month). It
        has disbursed
        <strong class="text-red-200"
          >{{ formatCurrency(s.totalExpense.value) }} ({{
            formatPercentage(s.totalExpense.percentage)
          }})</strong
        >
        which consists of
      </p>
      <ul class="mt-2">
        <li>
          <strong class="text-red-200"
            >{{ formatCurrency(s.expenseToMaintainers.value) }} ({{
              formatPercentage(s.expenseToMaintainers.percentage)
            }})</strong
          >
          to maintainers
        </li>
        <li>
          <strong class="text-red-200"
            >{{ formatCurrency(s.expenseToUsers.value) }} ({{
              formatPercentage(s.expenseToUsers.percentage)
            }})</strong
          >
          to users
        </li>
        <li>
          <strong class="text-red-200"
            >{{ formatCurrency(s.expenseToCollectives.value) }} ({{
              formatPercentage(s.expenseToCollectives.percentage)
            }})</strong
          >
          to other collectives
        </li>
        <li>
          <strong class="text-red-200"
            >{{ formatCurrency(s.expenseByMiscFees.value) }} ({{
              formatPercentage(s.expenseByMiscFees.percentage)
            }})</strong
          >
          on host and payment processor fees
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
strong {
  font-size: 1.5rem;
  font-weight: 500;
}
</style>
