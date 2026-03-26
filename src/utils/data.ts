import type { Account, CollectiveData, Transaction } from './types'

export async function fetchCollectiveData(org: string): Promise<CollectiveData> {
  const [account, transactions] = await Promise.all([
    // Both endpoints have different cache duration, so separated
    fetchAccount(org),
    fetchTransactions(org),
  ])
  const data: CollectiveData = {
    name: org,
    account,
    transactions,
  }
  return data
}

async function fetchAccount(org: string): Promise<Account> {
  const res = await fetch(`/api/account/${org}`)
  const result = await res.json()
  return result.account
}

async function fetchTransactions(org: string): Promise<Transaction[]> {
  const transactions: Transaction[] = []
  let nextUrl: string | null = `/api/transactions/${org}`

  while (nextUrl) {
    const res = await fetch(nextUrl)
    if (!res.ok) {
      throw new Error(`Failed to fetch transactions for "${org}": ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    transactions.push(...data.transactions)

    const linkHeader = res.headers.get('Link')
    const nextMatch = /<([^>]+)>\s*;\s*rel="next"/.exec(linkHeader ?? '')
    nextUrl = nextMatch?.[1] ?? null
  }

  return transactions
}

export function getBalanceInCentsForTransaction(
  transactions: Transaction[],
  index: number,
): number | null {
  const tx = transactions[index]
  if (tx == null) return null

  if (tx.balanceInHostCurrency?.valueInCents != null) {
    return tx.balanceInHostCurrency.valueInCents
  }

  // If balance is not available, we can calculate it by finding the last available balance, and
  // apply the credit/debit amounts
  let balance: number | null = null
  let balanceIndex: number | null = null
  for (let i = index - 1; i >= 0; i--) {
    const prevTx = transactions[i]!
    if (prevTx.balanceInHostCurrency?.valueInCents != null) {
      balance = prevTx.balanceInHostCurrency.valueInCents
      balanceIndex = i
      break
    }
  }
  if (balance == null || balanceIndex == null) return null

  console.log(balance, balanceIndex, index)

  for (let i = balanceIndex; i <= index; i++) {
    const tx = transactions[i]!
    const amount = tx.amountInHostCurrency?.valueInCents
    // Amount is already with correct sign for credit/debit
    if (amount != null) balance += amount
  }
  return balance
}
