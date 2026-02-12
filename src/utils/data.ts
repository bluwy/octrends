import type { CollectiveData } from '../types'

export function getEarliestDate(data: CollectiveData[]): Date | null {
  let earliest: Date | null = null

  for (const d of data) {
    for (const tx of d.transactions) {
      if (!tx.clearedAt) continue
      const txDate = new Date(tx.createdAt)
      if (!earliest || txDate < earliest) {
        earliest = txDate
      }
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
