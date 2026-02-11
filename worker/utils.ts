export const userAgentHeader = {
  'User-Agent': 'octrends (https://github.com/bluwy/octrends)',
}

export function getOpenCollectiveTokenHeader(env: Env): Record<string, string> {
  const token = env.OPEN_COLLECTIVE_TOKEN
  return token ? { 'Personal-Token': token } : {}
}
