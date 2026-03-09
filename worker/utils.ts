export const openCollectiveGraphQLEndpoint = 'https://api.opencollective.com/graphql/v2'

export const userAgentHeader = {
  'User-Agent': 'octrends (https://github.com/bluwy/octrends)',
}

export function getOpenCollectiveTokenHeader(env: Env): Record<string, string> {
  const token = env.OPEN_COLLECTIVE_TOKEN
  if (!env.DEV && !token) {
    throw new Error('OPEN_COLLECTIVE_TOKEN is required in production')
  }
  return token ? { 'Personal-Token': token } : {}
}
