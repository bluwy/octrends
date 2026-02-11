import * as transactions from './routes/transactions.ts'
import type { RouteHandler } from './types.ts'

const routes: { handler: RouteHandler }[] = [transactions]

export default {
  async fetch(request, env, ctx): Promise<Response> {
    for (const route of routes) {
      const response = await route.handler(request, env, ctx)
      if (response) return response
    }
    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
