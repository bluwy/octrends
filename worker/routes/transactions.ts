import type { RouteHandler } from '../types.ts'
import type { GetTransactionsQuery, GetTransactionsQueryVariables } from '../graphql-types.ts'
import { getOpenCollectiveTokenHeader, userAgentHeader } from '../utils.ts'

const updateIntervalMs = 1 * 60 * 60 * 1000 // 1 hour
const responseTtl = 30 * 60 // 30 minutes
const url = 'https://api.opencollective.com/graphql/v2'
// Bump this if the query data changes so we invalidate the cache and refetch all the transactions again
const queryVersion = 'v1'
// NOTE: OC's data does not seem to be complete from the API, it's missing:
// - The original (non-host) currency (e.g. EUR, MYR, etc)
// - The `merchantId`
// - The `hostFee` sometimes, as it's separated as its own `HOST_FEE` transaction
// - The `platformFee` sometimes, as it's separated as its own `PLATFORM_FEE` transaction
// - The `paymentProcessorFee` sometimes, as it's separated as its own `PAYMENT_PROCESSOR_FEE` transaction
//
// As a result, we simplify the query to only get useful data. Perhaps some of the fields
// are legacy data that may actually be returned, but to simplify things, we only work with
// the data we're working with for now (since 2023).
const query = /* GraphQL */ `
  query GetTransactions($slug: String!, $after: DateTime, $limit: Int!, $offset: Int!) {
    transactions(
      account: { slug: $slug }
      limit: $limit
      offset: $offset
      dateFrom: $after
      orderBy: { field: CREATED_AT, direction: ASC }
      includeHost: true
      includeRegularTransactions: true
      includeIncognitoTransactions: false
      includeChildrenTransactions: true
      includeGiftCardTransactions: true
      includeDebts: true
    ) {
      offset
      limit
      totalCount
      nodes {
        id
        group
        type
        kind
        refundKind
        amountInHostCurrency {
          currency
          valueInCents
        }
        platformFee {
          currency
          valueInCents
        }
        hostFee {
          currency
          valueInCents
        }
        paymentProcessorFee {
          currency
          valueInCents
        }
        oppositeAccount {
          id
          slug
          type
          name
        }
        createdAt
        updatedAt
        clearedAt
        isRefunded
        isRefund
        isDisputed
        isInReview
        isOrderRejected
        balanceInHostCurrency {
          currency
          valueInCents
        }
      }
    }
  }
`

type Transaction = NonNullable<NonNullable<GetTransactionsQuery['transactions']['nodes']>[number]>

interface CacheMetadata {
  /** Query version */
  version: string
  /** ISO string */
  lastUpdated: string
}

export const handler: RouteHandler = async (request, env, ctx) => {
  const url = new URL(request.url)
  // Accept /api/transactions/<slug> (slug can only contain lowercase a-z and dash)
  const match = url.pathname.match(/^\/api\/transactions\/([a-z0-9\-]+)$/)
  if (!match) return

  const slug = match[1]

  const cached = await env.OPEN_COLLECTIVE_TRANSACTIONS.getWithMetadata<CacheMetadata>(slug)
  // Transactions is only set if we have cached data but is outdated
  let transactions: Transaction[] | undefined
  if (cached.value && cached.metadata?.version === queryVersion && cached.metadata?.lastUpdated) {
    const lastUpdated = cached.metadata.lastUpdated
    const age = Date.now() - new Date(lastUpdated).getTime()

    if (age < updateIntervalMs) {
      if (env.DEV) console.log(`Using cache for "${slug}", age: ${age}ms`)

      return new Response(cached.value, {
        headers: {
          'Content-Type': 'application/json',
          ...(env.DEV
            ? {}
            : {
                'Cache-Control': `public, max-age=${responseTtl}`,
              }),
        },
      })
    }

    if (env.DEV) console.log(`Cache for "${slug}" is outdated, refetching...`)
    transactions = JSON.parse(cached.value).transactions
  }

  const currentDate = new Date()
  const lastCreatedAt = transactions ? transactions[transactions.length - 1]?.createdAt : undefined
  const newTransactions = await fetchTransactions(slug, lastCreatedAt, env)
  if (newTransactions instanceof Response) {
    return newTransactions
  }
  if (transactions) {
    transactions.push(...newTransactions)
  } else {
    transactions = newTransactions
  }
  const result = JSON.stringify({ transactions })

  if (env.DEV)
    console.log(
      `Returned ${newTransactions.length} new transactions for "${slug}". Total is now ${transactions.length} transactions.`,
    )

  ctx.waitUntil(
    env.OPEN_COLLECTIVE_TRANSACTIONS.put(slug, result, {
      metadata: {
        version: queryVersion,
        lastUpdated: currentDate.toISOString(),
      },
    }),
  )

  return new Response(result, {
    headers: {
      'Content-Type': 'application/json',
      ...(env.DEV
        ? {}
        : {
            'Cache-Control': `public, max-age=${responseTtl}`,
          }),
    },
  })
}

async function fetchTransactions(
  slug: string,
  after: string | undefined,
  env: Env,
): Promise<Response | Transaction[]> {
  const transactions: Transaction[] = []
  const limit = 1000 // OC max limit is 1000
  let offset = 0

  do {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getOpenCollectiveTokenHeader(env),
        ...userAgentHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          slug,
          after,
          limit,
          offset,
        } satisfies GetTransactionsQueryVariables,
      }),
    })

    const result: { errors?: unknown; data: GetTransactionsQuery } = await response.json()

    if (result.errors) {
      if (isAccountNotFound(result.errors)) {
        return new Response(`Collective "${slug}" not found`, { status: 404 })
      }
      throw new Error(
        `Error fetching transactions for collective "${slug}": ${JSON.stringify(result.errors)}`,
      )
    }

    const nodes = result.data.transactions.nodes
    if (nodes == null) break
    const totalCount = result.data.transactions.totalCount
    if (totalCount == null) break

    if (env.DEV)
      console.log(
        `Fetched ${nodes.length} transactions for "${slug}" (offset: ${offset}, total: ${totalCount})`,
      )

    for (const node of nodes) {
      if (node == null) continue // this shouldn't happen in practice
      transactions.push(node)
    }
    offset += nodes.length

    if (offset >= totalCount) break
  } while (true)

  return transactions
}

function isAccountNotFound(errors: any): boolean {
  try {
    return errors[0].extensions.code === 'NotFound'
  } catch {}
  return false
}
