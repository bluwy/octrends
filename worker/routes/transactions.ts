import type { RouteHandler } from '../types.ts'
import type { GetTransactionsQuery, GetTransactionsQueryVariables } from '../graphql-types.ts'
import {
  getOpenCollectiveTokenHeader,
  openCollectiveGraphQLEndpoint,
  userAgentHeader,
} from '../utils.ts'

const updateIntervalMs = 1 * 60 * 60 * 1000 // 1 hour
const responseTtl = 30 * 60 // 30 minutes (seconds)
const maxTotalTransactions = 80_000 // Skip collectives that has excessive transactions for now (See NOTES.md)
const pageSize = 10_000
const queryFetchLimit = 1_000 // OC max limit is 1000
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
  query GetTransactions($slug: String!, $limit: Int!, $offset: Int!) {
    transactions(
      account: { slug: $slug }
      limit: $limit
      offset: $offset
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

// TODO: Maybe also track when the oppositeAccount is last updated in case the slug or name changes.
// Could be quite intensive to query though if there's like thousands of accounts.
interface CacheMetadata {
  /** Query version */
  version: string
  /** ISO string */
  lastUpdated: string
  /** Pagination */
  hasNextPage: boolean
  /** Current count of transactions */
  pageTransactionsCount: number
}

export const handler: RouteHandler = async (request, env, ctx) => {
  const url = new URL(request.url)
  // Accept /api/transactions/<slug> (slug can only contain lowercase a-z and dash)
  const match = url.pathname.match(/^\/api\/transactions\/([a-z0-9\-]+)$/)
  if (!match) return

  const slug = match[1]
  const page = parseInt(url.searchParams.get('page') || '0', 10)
  if (Number.isNaN(page) || page < 0) {
    return new Response('Invalid "page" query parameter', { status: 400 })
  }
  const cacheKey = `${slug}?page=${page}`
  const KV = env.OCTRENDS_TRANSACTIONS

  let cached: KVNamespaceGetWithMetadataResult<ReadableStream<any>, CacheMetadata> | null =
    await KV.getWithMetadata<CacheMetadata>(cacheKey, { type: 'stream' })
  if (cached?.value && cached.metadata?.version !== queryVersion) {
    if (env.DEV)
      console.log(
        `Cache version mismatch for "${slug}" (i: ${page}), expected "${queryVersion}", got "${cached.metadata?.version}". Skipping cache...`,
      )
    cached = null
  }
  if (cached?.value && cached.metadata) {
    const lastUpdated = cached.metadata.lastUpdated
    const hasNextPage = cached.metadata.hasNextPage
    const age = Date.now() - new Date(lastUpdated).getTime()

    // If there's a next page, it means this page is already full and there's no reason to update this page
    if (hasNextPage || age < updateIntervalMs) {
      if (env.DEV) console.log(`Using cache for "${slug}" (i: ${page}, age: ${age}ms)`)

      return new Response(cached.value, {
        headers: {
          'Content-Type': 'application/json',
          ...getLinkHeaders(url, page, hasNextPage),
          ...getCacheHeaders(env),
        },
      })
    }

    if (env.DEV) console.log(`Cache for "${slug}" (i: ${page}) is outdated, refetching...`)
  }

  const currentDate = new Date()
  const pageTransactionsCount = cached?.metadata?.pageTransactionsCount || 0
  const fetchedTransactions = await fetchTransactionsPage(slug, page, pageTransactionsCount, env)
  if (fetchedTransactions instanceof Response) {
    return fetchedTransactions
  }

  const { transactions, hasNextPage } = fetchedTransactions
  const newTransactionsCount = transactions.length + pageTransactionsCount
  if (env.DEV)
    console.log(
      `Returned ${transactions.length} transactions for "${slug}" (page: ${page}, chunkCount: ${newTransactionsCount}).`,
    )

  // If no new transactions, just update the metadata to refresh the cache expiration
  if (cached?.value && cached.metadata && transactions.length === 0) {
    // NOTE: This isn't ideal as KV will read eagerly, and Response will be pull-based depending on
    // the consumer bandwidth, but the alternative is to put this metadata as a separate key-value
    // and that'll make things more complex for now.
    const tee = cached.value.tee()

    ctx.waitUntil(
      KV.put(cacheKey, tee[0], {
        metadata: {
          version: queryVersion,
          lastUpdated: currentDate.toISOString(),
          hasNextPage: cached.metadata.hasNextPage,
          pageTransactionsCount: cached.metadata.pageTransactionsCount,
        } as CacheMetadata,
      }),
    )

    return new Response(tee[1], {
      headers: {
        'Content-Type': 'application/json',
        ...getLinkHeaders(url, page, cached.metadata.hasNextPage),
        ...getCacheHeaders(env),
      },
    })
  }

  // If there are new transactions, append them to the existing cache value or create a new one
  const newTransactionsStr = cached?.value
    ? await appendTransactionsToCache(cached.value, transactions)
    : JSON.stringify({ transactions })

  ctx.waitUntil(
    KV.put(cacheKey, newTransactionsStr, {
      metadata: {
        version: queryVersion,
        lastUpdated: currentDate.toISOString(),
        hasNextPage,
        pageTransactionsCount: newTransactionsCount,
      } as CacheMetadata,
    }),
  )

  return new Response(newTransactionsStr, {
    headers: {
      'Content-Type': 'application/json',
      ...getLinkHeaders(url, page, hasNextPage),
      ...getCacheHeaders(env),
    },
  })
}

async function fetchTransactionsPage(
  slug: string,
  page: number,
  pageTransactionsCount: number,
  env: Env,
): Promise<Response | { transactions: Transaction[]; hasNextPage: boolean }> {
  const transactions: Transaction[] = []
  const pageStartOffset = page * pageSize
  const availableCountLeft = pageSize - pageTransactionsCount
  let offset = pageStartOffset + pageTransactionsCount
  let hasNextPage = false

  while (true) {
    const limit = Math.min(queryFetchLimit, availableCountLeft - transactions.length)
    if (limit <= 0) break

    const response = await fetch(openCollectiveGraphQLEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getOpenCollectiveTokenHeader(env),
        ...userAgentHeader,
      },
      body: JSON.stringify({
        query,
        variables: { slug, limit, offset } satisfies GetTransactionsQueryVariables,
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

    const totalCount = result.data.transactions.totalCount
    if (totalCount == null) break

    if (totalCount > maxTotalTransactions) {
      return new Response(`Collective "${slug}" has too many transactions (${totalCount})`, {
        status: 400,
        // Cache 400 to avoid repeatedly fetching collectives with excessive transactions
        headers: getCacheHeaders(env),
      })
    }

    // Out of range: there is no page starting at this offset.
    if (page > 0 && pageStartOffset >= totalCount) {
      return new Response('"page" query parameter is out of range', { status: 400 })
    }

    const nodes = result.data.transactions.nodes
    if (nodes == null) break
    hasNextPage = offset + nodes.length < totalCount

    if (env.DEV)
      console.log(
        `Fetched ${nodes.length} transactions for "${slug}" (offset: ${offset}, total: ${totalCount})`,
      )

    for (const node of nodes) {
      if (node == null) continue // this shouldn't happen in practice
      transactions.push(node)
    }

    offset += nodes.length

    // If for some reaosn nodes.length is 0, break out
    if (nodes.length === 0) break
    // If this is the end of the total, break out
    if (offset >= totalCount) break
  }

  return { transactions, hasNextPage }
}

async function appendTransactionsToCache(
  cacheValue: ReadableStream<any>,
  newTransactions: Transaction[],
): Promise<string> {
  // Convert to string, then append at the very last `]}` closing (Do not JSON.parse for perf)
  const cacheValueStr = await new Response(cacheValue).text()
  const newTransactionsStr = JSON.stringify(newTransactions)

  return (
    cacheValueStr.slice(0, -2) + // remove the last `]}`
    (cacheValueStr.at(-3) === '[' ? '' : ',') + // add comma if there are existing transactions
    newTransactionsStr.slice(1, -1) + // remove the surrounding `[]`
    ']}'
  )
}

function isAccountNotFound(errors: any): boolean {
  try {
    return errors[0].extensions.code === 'NotFound'
  } catch {}
  return false
}

function getLinkHeaders(url: URL, pageIndex: number, hasNextPage: boolean): Record<string, string> {
  const headers: Record<string, string> = {}

  if (hasNextPage) {
    const nextUrl = new URL(url.toString())
    nextUrl.search = ''
    nextUrl.searchParams.set('page', String(pageIndex + 1))
    headers.Link = `<${nextUrl.pathname}${nextUrl.search}>; rel="next"`
  }

  return headers
}

function getCacheHeaders(env: Env): Record<string, string> {
  return env.DEV ? {} : { 'Cache-Control': `public, max-age=${responseTtl}` }
}
