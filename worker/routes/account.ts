import type { RouteHandler } from '../types.ts'
import type { GetAccountQuery, GetAccountQueryVariables } from '../graphql-types.ts'
import {
  getOpenCollectiveTokenHeader,
  openCollectiveGraphQLEndpoint,
  userAgentHeader,
} from '../utils.ts'

const cacheTtl = 1 * 60 * 60 // 1 hour (seconds)

const query = /* GraphQL */ `
  query GetAccount($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      description
      tags
      socialLinks {
        type
        url
      }
      imageUrl
      createdAt
      members(role: [ADMIN, MEMBER], accountType: INDIVIDUAL) {
        totalCount
        nodes {
          id
          role
          createdAt
          updatedAt
          since
          account {
            id
            slug
            name
          }
        }
      }
    }
  }
`

// type Account = NonNullable<GetAccountQuery['account']>

export const handler: RouteHandler = async (request, env, ctx) => {
  const url = new URL(request.url)
  // Accept /api/account/<slug> (slug can only contain lowercase a-z and dash)
  const match = url.pathname.match(/^\/api\/account\/([a-z0-9\-]+)$/)
  if (!match) return

  const slug = match[1]

  const cacheKey = `${url.origin}${url.pathname}`
  const cache = caches.default

  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(openCollectiveGraphQLEndpoint, {
    method: 'POST',
    headers: {
      ...getOpenCollectiveTokenHeader(env),
      ...userAgentHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { slug } satisfies GetAccountQueryVariables,
    }),
  })

  const result: { errors?: unknown; data: GetAccountQuery } = await response.json()

  if (result.errors) {
    if (isAccountNotFound(result.errors)) {
      return new Response(`Collective "${slug}" not found`, { status: 404 })
    }
    throw new Error(
      `Error fetching account for collective "${slug}": ${JSON.stringify(result.errors)}`,
    )
  }

  const account = result.data.account
  if (!account) {
    return new Response(`Account data missing for collective "${slug}"`, { status: 404 })
  }

  const finalResponse = Response.json(
    { account },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(env.DEV ? {} : { 'Cache-Control': `public, max-age=${cacheTtl}` }),
      },
    },
  )

  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()))

  return finalResponse
}

function isAccountNotFound(errors: any): boolean {
  try {
    return errors[0].message.includes('No collective found')
  } catch {}
  return false
}
