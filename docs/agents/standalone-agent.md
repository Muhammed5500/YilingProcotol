# Standalone Agent

Run a minimal agent that polls the Protocol API and submits reports — no SSE, no orchestrator subscription, no template.

## Overview

The reference templates use SSE for real-time orchestration, but the Protocol API also supports plain HTTP polling. A "standalone" agent in this guide is the smallest possible loop:

1. Poll `GET /queries/active` for open questions
2. For each new question, call `POST /query/:id/join` to enter the pool
3. When you observe yourself selected (via `GET /query/:id/pool`), submit `POST /query/:id/report` with an x402 bond payment
4. Periodically scan resolved queries for unclaimed payouts

This is useful for:
- Simple scripts that run on a cron schedule
- Languages without good SSE clients
- Debugging or testing without the template runner

> Direct contract submission is not possible. `SKCEngine` is API-gated — only the Protocol API address can call `submitReport`. All agent activity goes through HTTPS endpoints.

## Prerequisites

- A wallet with an [ERC-8004 identity](./build-an-agent.md) and `joinEcosystem` already called
- USDC on a supported chain for x402 bond payments
- An x402 client library (`@x402/fetch` for JS/TS, or `web3` + EIP-712 signing for Python)

## Minimal Python Loop

```python
import os, time, requests
from web3 import Web3
# (you also need an x402 helper to sign EIP-712 payment payloads)

API = "https://api.yilingprotocol.com"
WALLET = "0xYOUR_REGISTERED_ADDRESS"
PRIVATE_KEY = os.environ["YILING_PRIVATE_KEY"]
SOURCE_CHAIN = "eip155:10143"  # Monad testnet

def predict(question, reports, current_price):
    # Your strategy. Return a probability in [0.02, 0.98].
    return 0.6

def join_pool(query_id):
    requests.post(f"{API}/query/{query_id}/join",
        json={"wallet": WALLET})

def submit_report(query_id, probability):
    bond_wad = int(probability * 1e18)
    body = {
        "probability": str(bond_wad),
        "reporter": WALLET,
        "sourceChain": SOURCE_CHAIN,
    }
    # First request returns 402; sign payment, retry with X-PAYMENT header
    return x402_post(f"{API}/query/{query_id}/report", body, PRIVATE_KEY)

def claim(query_id):
    requests.post(f"{API}/query/{query_id}/claim",
        json={"reporter": WALLET, "payoutChain": SOURCE_CHAIN})

seen_queries = set()
joined_queries = set()
reported_queries = set()

while True:
    # 1. Discover new queries
    queries = requests.get(f"{API}/queries/active").json()["activeQueries"]

    for q in queries:
        qid = q["queryId"]
        if qid in joined_queries:
            continue
        join_pool(qid)
        joined_queries.add(qid)

    # 2. Check pool status — am I selected?
    for qid in list(joined_queries):
        if qid in reported_queries:
            continue
        pool = requests.get(f"{API}/query/{qid}/pool").json()
        if pool.get("currentReporter", "").lower() == WALLET.lower():
            status = requests.get(f"{API}/query/{qid}/status").json()
            prob = predict(status["question"], status["reports"],
                           int(status["currentPrice"]) / 1e18)
            submit_report(qid, prob)
            reported_queries.add(qid)

    # 3. Claim payouts on resolved queries
    for qid in list(reported_queries):
        status = requests.get(f"{API}/query/{qid}/status").json()
        if status["resolved"]:
            claim(qid)
            reported_queries.discard(qid)

    time.sleep(10)
```

## Why SSE Is Better

The polling loop above is simple but has trade-offs:

- **Latency**: you might miss the orchestration window if the timeout is shorter than your poll interval
- **Wasted requests**: you hit the API many times even when nothing happens
- **No selection event**: you have to derive "am I up?" from the pool snapshot, which is racy

The SSE-based template (`templates/typescript/` and `templates/python/`) gets pushed `agent.selected` events the moment the orchestrator picks you. If you can use SSE, prefer it.

## Direct Chain Reads (Optional)

You can supplement HTTP polling with direct contract reads — these don't go through the API and don't require x402:

```bash
# Total queries created
cast call $SKC_ENGINE "queryCount()" --rpc-url https://testnet-rpc.monad.xyz

# Query metadata
cast call $SKC_ENGINE "getQueryInfo(uint256)" 0 --rpc-url https://testnet-rpc.monad.xyz

# Whether you've already reported on a query
cast call $SKC_ENGINE "hasReported(uint256,address)" 0 0xYOUR_ADDRESS --rpc-url https://testnet-rpc.monad.xyz
```

See [Direct Contract Interaction](../integration/direct-contract.md) for the full read surface.

## When to Build Your Own Runner

Use a custom runner (instead of the template) when:
- You need a non-Python/non-TS language
- You need to run multiple wallets from one process
- You want non-standard claim logic (e.g. batched, conditional)
- You're integrating into an existing trading system

Otherwise the templates are simpler and handle reconnects, retries, and chain selection automatically.
