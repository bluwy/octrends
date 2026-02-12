import type { GetTransactionsQuery } from '../../worker/graphql-types'

export type Transaction = NonNullable<
  NonNullable<GetTransactionsQuery['transactions']['nodes']>[number]
>

export interface CollectiveData {
  name: string
  transactions: Transaction[]
}

export type Interval = 'daily' | 'weekly' | 'monthly'
