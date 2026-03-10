## Get top collectives by transactions

_requires `curl` and `jq`_

```bash
curl https://api.opencollective.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { accounts(limit: 50, skipRecentAccounts: true, type: COLLECTIVE, orderBy: { direction: DESC, field: ACTIVITY }) { totalCount nodes { name transactions { totalCount } } } }"
  }' | jq -r '.data.accounts.nodes[] | "\(.name): \(.transactions.totalCount)"'
```
