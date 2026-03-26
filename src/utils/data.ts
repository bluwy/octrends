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
