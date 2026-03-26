## Get top collectives by transactions

_requires `curl` and `jq`_

```bash
curl https://api.opencollective.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { accounts(limit: 50, skipRecentAccounts: true, type: COLLECTIVE, orderBy: { direction: DESC, field: ACTIVITY }) { totalCount nodes { slug transactions { totalCount } } } }"
  }' | jq -r '.data.accounts.nodes[] | "\(.slug): \(.transactions.totalCount)"'
```

Results on 2025-03-10:

```txt
logseq: 389358
phpfoundation: 63703
ankidroid: 62625
dim: 59692
bushwick-ayuda-mutua: 50623
webpack: 47309
darkreader: 37802
generator-jhipster: 30670
11ty: 29924
oxford-mutual-aid: 28113
mochajs: 28080
nest: 25805
socketio: 25237
jellyfin: 24191
babel: 23981
stashapp: 23400
qubes-os: 23097
opencore-legacy-patcher: 22392
playframework: 22270
core-js: 21459
swiper: 21368
date-fns: 20776
nixos: 19432
flybywire: 19026
obsproject: 17691
transaidcymru: 17619
sonarr: 18099
club-a-kitchen: 17511
streetmix: 17465
radarr: 17003
vuejs: 16770
manjaro: 17039
getsolus: 16584
svelte: 16324
1kproject: 16399
asahilinux: 15674
bootstrap-vue: 15559
mastodonworld: 14864
street-forum: 14752
swma_nyc: 14240
eslint: 14308
f-droid: 13761
jest: 13644
lairdubois-opencutlist-sketchup-extension: 12760
openaddresses: 12712
servo: 12411
endeavouros: 12345
rpfreestore: 12012
communitykitchenmpls: 11861
crystal-lang: 11694
```

## Copy local KV data to production

```bash
bash ./scripts/copy-kv.sh fa70f07ca9ee4d849d01269caa2f1b05
```
