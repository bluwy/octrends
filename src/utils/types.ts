import type { GetAccountQuery, GetTransactionsQuery } from '../../worker/graphql-types'

export type Account = NonNullable<GetAccountQuery['account']>

export type Transaction = NonNullable<
  NonNullable<GetTransactionsQuery['transactions']['nodes']>[number]
>

export interface CollectiveData {
  name: string
  account: Account
  transactions: Transaction[]
}

export type Interval = 'daily' | 'weekly' | 'monthly'
