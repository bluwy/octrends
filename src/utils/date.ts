import type { CollectiveData } from './types'

export const endOfToday = endOfDay(new Date())

export function startOfDay(d: Date) {
  const result = new Date(d)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

export function endOfDay(d: Date) {
  const result = new Date(d)
  result.setUTCHours(23, 59, 59, 999)
  return result
}

export function getEarliestDate(data: CollectiveData[]): Date | null {
  let earliest: Date | null = null

  for (const d of data) {
    const createdAtDate = new Date(d.account.createdAt)
    if (!earliest || createdAtDate < earliest) {
      earliest = createdAtDate
    }
  }

  return earliest
}

export function getLatestDate(data: CollectiveData[]): Date | null {
  let latest: Date | null = null

  for (const d of data) {
    for (const tx of d.transactions) {
      if (!tx.clearedAt) continue
      const txDate = new Date(tx.createdAt)
      if (!latest || txDate > latest) {
        latest = txDate
      }
    }
  }

  return latest
}
