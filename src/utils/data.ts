import type { CollectiveData } from './types'

export async function fetchCollectivesData(orgs: string[]): Promise<CollectiveData[]> {
  return await Promise.all(
    orgs.map(async (org) => {
      try {
        return await fetchCollectiveData(org)
      } catch (e) {
        throw new Error(`Error fetching data for ${org}`, { cause: e })
      }
    }),
  )
}

async function fetchCollectiveData(org: string): Promise<CollectiveData> {
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

async function fetchAccount(org: string) {
  const res = await fetch(`/api/account/${org}`)
  const result = await res.json()
  return result.account
}

async function fetchTransactions(org: string) {
  let res: Response
  let retryCount = 0
  do {
    res = await fetch(`/api/transactions/${org}`)
    retryCount++
  } while (res.status === 206 && retryCount < 20)

  if (res.status !== 206) {
    const data = await res.json()
    return data.transactions
  } else {
    // If still 206 after retries, treat as error
    throw new Error(`Transactions for "${org}" endpoint returned 206 too many times`)
  }
}
