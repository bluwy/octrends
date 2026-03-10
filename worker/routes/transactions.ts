import type { RouteHandler } from '../types.ts'
import type { GetTransactionsQuery, GetTransactionsQueryVariables } from '../graphql-types.ts'
import {
  getOpenCollectiveTokenHeader,
  openCollectiveGraphQLEndpoint,
  userAgentHeader,
} from '../utils.ts'

const updateIntervalMs = 1 * 60 * 60 * 1000 // 1 hour
const responseTtl = 30 * 60 // 30 minutes (seconds)
const maxKvSize = 26_214_000 // 26214400 bytes (26MiB) minus some bytes for leeway.
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
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

// TODO: Maybe also track when the oppositeAccount is last updated in case the slug or name changes.
// Could be quite intensive to query though if there's like thousands of accounts.
interface CacheMetadata {
  /** Query version */
  version: string
  /** ISO string */
  lastUpdated: string
  /** Number of chunks the value is split into */
  chunkCount: number
}

export const handler: RouteHandler = async (request, env, ctx) => {
  const url = new URL(request.url)
  // Accept /api/transactions/<slug> (slug can only contain lowercase a-z and dash)
  const match = url.pathname.match(/^\/api\/transactions\/([a-z0-9\-]+)$/)
  if (!match) return

  const slug = match[1]

  const cached = await kvGetWithChunks(env.OPEN_COLLECTIVE_TRANSACTIONS, slug, env)
  let transactions: Transaction[] | undefined
  if (cached.value && cached.metadata?.version === queryVersion && cached.metadata?.lastUpdated) {
    const lastUpdated = cached.metadata.lastUpdated
    const age = Date.now() - new Date(lastUpdated).getTime()
    const chunkCount = cached.metadata.chunkCount

    if (age < updateIntervalMs) {
      if (env.DEV) console.log(`Using cache for "${slug}", age: ${age}ms, chunks: ${chunkCount}`)

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
    kvPutWithChunks(
      env.OPEN_COLLECTIVE_TRANSACTIONS,
      slug,
      result,
      {
        version: queryVersion,
        lastUpdated: currentDate.toISOString(),
      },
      env,
    ),
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

  // Increment after by 1ms because OC's API is inclusive for some reason
  after = after ? new Date(new Date(after).getTime() + 1).toISOString() : undefined

  do {
    const response = await fetch(openCollectiveGraphQLEndpoint, {
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

    // Add data
    for (const node of nodes) {
      if (node == null) continue // this shouldn't happen in practice
      transactions.push(node)
    }

    // Iterate the next page
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

async function kvGetWithChunks(
  kv: KVNamespace,
  key: string,
  env: Env,
): Promise<KVNamespaceGetWithMetadataResult<string, CacheMetadata>> {
  const cached = await kv.getWithMetadata<CacheMetadata>(key)
  if (!cached.value) return cached

  const chunkCount = cached.metadata?.chunkCount || 1
  if (chunkCount === 1)
    return { value: cached.value, metadata: cached.metadata, cacheStatus: cached.cacheStatus }

  if (env.DEV)
    console.log(
      `Value for key "${key}" is ${cached.value.length} bytes, stored in ${chunkCount} chunks.`,
    )

  let allStrs = cached.value
  for (let i = 1; i < chunkCount; i++) {
    const chunkKey = `${key}-chunk-${i}`
    const chunk = await kv.get(chunkKey)
    if (chunk) allStrs += chunk
    else
      console.warn(
        `Missing chunk ${i} for key "${key}" in KV, expected ${chunkCount} chunks but got less.`,
      )
  }
  return { value: allStrs, metadata: cached.metadata, cacheStatus: cached.cacheStatus }
}

async function kvPutWithChunks(
  kv: KVNamespace,
  key: string,
  value: string,
  metadata: Record<string, any>,
  env: Env,
) {
  const chunks = splitStringByBytes(value, maxKvSize)
  const chunkCount = chunks.length
  if (chunkCount === 1) {
    await kv.put(key, value, { metadata: { ...metadata, chunkCount } })
    return
  }

  if (env.DEV)
    console.log(
      `Value for key "${key}" is ${value.length} bytes, splitting into ${chunkCount} chunks for KV storage.`,
    )

  const promises = []
  promises.push(kv.put(key, chunks[0], { metadata: { ...metadata, chunkCount } }))
  for (let i = 1; i < chunkCount; i++) {
    const chunkKey = `${key}-chunk-${i}`
    promises.push(kv.put(chunkKey, chunks[i]))
  }
  await Promise.all(promises)
}

function splitStringByBytes(str: string, maxBytes: number): string[] {
  const bytes = textEncoder.encode(str)
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += maxBytes) {
    const chunkBytes = bytes.subarray(i, i + maxBytes)
    chunks.push(textDecoder.decode(chunkBytes))
  }
  return chunks
}
