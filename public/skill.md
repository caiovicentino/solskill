---
name: solskill
version: 1.0.0
description: DeFi Skills for AI Agents on Solana - Jupiter swaps, Kamino lending & vaults, Raydium liquidity
homepage: https://solskill.ai
metadata: {"category": "defi", "chain": "solana", "api_base": "https://solskill.ai/api/v1"}
---

# SolSkill — DeFi Skills for AI Agents

You have access to DeFi operations on Solana via the SolSkill API.

## Base URL
```
https://solskill.ai/api/v1
```

## Authentication

Protected endpoints require an API key:

```bash
# Option 1: x-api-key header (recommended)
curl -H "x-api-key: solskill_your_api_key_here" ...

# Option 2: Authorization header  
curl -H "Authorization: Bearer solskill_your_api_key_here" ...
```

### Public Endpoints (no auth)
- `GET /jupiter/tokens` — List tokens
- `GET /jupiter/quote` — Swap quote
- `GET /raydium/quote` — Raydium quote
- `GET /raydium/pools` — List pools
- `GET /kamino/markets` — Lending markets with supply/borrow APY
- `GET /kamino/reserves` — Reserves with APY
- `GET /kamino/vaults` — Yield vaults with APY and TVL
- `GET /kamino/positions` — User positions
- `GET /wallet/balance` — Wallet balances
- `GET /stats` — Platform statistics (agents, volume, uptime)
- `GET /portfolio` — Full portfolio with positions (requires wallet param)

### Protected Endpoints (API key required)
- `POST /jupiter/swap` — Execute swap
- `POST /raydium/swap` — Raydium swap
- `POST /raydium/pools/add-liquidity` — Add liquidity
- `POST /raydium/pools/remove-liquidity` — Remove liquidity
- `POST /kamino/deposit` — Deposit/withdraw
- `POST /kamino/borrow` — Borrow/repay
- `POST /wallet/send` — Send tokens
- `GET /wallet/receive` — Deposit address
- `GET /wallet/transactions` — Transaction history
- `POST /orders` — Limit orders
- `POST /alerts` — Price alerts

---

## Quick Start: Agent Self-Registration

### 1. Register Your Agent
```bash
curl -X POST https://solskill.ai/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "YourAgentName"}'
```

Response:
```json
{
  "success": true,
  "agent_id": "agent_abc123",
  "claim_url": "https://solskill.ai/claim/abc123xyz",
  "expires_in": 3600,
  "message": "Have your human visit claim_url to authorize and receive API key"
}
```

### 2. Human Claims the Agent
1. Human visits `claim_url` in browser
2. Human connects wallet and approves
3. Page displays API key
4. Agent stores credentials

### 3. Store Credentials
```bash
mkdir -p ~/.config/solskill
cat > ~/.config/solskill/credentials.json << 'EOF'
{
  "api_key": "solskill_your_api_key_here",
  "agent_id": "agent_abc123"
}
EOF
chmod 600 ~/.config/solskill/credentials.json
```

### 4. Use in Requests
```bash
API_KEY=$(jq -r .api_key ~/.config/solskill/credentials.json)
curl -H "x-api-key: $API_KEY" https://solskill.ai/api/v1/...
```

---

## Token Swaps (Jupiter)

### List Tokens
```bash
GET /jupiter/tokens
GET /jupiter/tokens?all=true  # All verified tokens
```

### Get Quote
```bash
GET /jupiter/quote?inputMint=SOL_MINT&outputMint=USDC_MINT&amount=LAMPORTS&slippageBps=50
```

### Execute Swap ⚠️ Protected
```bash
POST /jupiter/swap
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "userPublicKey": "YOUR_WALLET",
  "slippageBps": 50
}
```

---

## Token Swaps (Raydium)

### Get Quote
```bash
GET /raydium/quote?inputMint=SOL_MINT&outputMint=USDC_MINT&amount=LAMPORTS
```

### Execute Swap ⚠️ Protected
```bash
POST /raydium/swap
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "userPublicKey": "YOUR_WALLET",
  "slippageBps": 50
}
```

---

## Liquidity Pools (Raydium)

### List Pools
```bash
GET /raydium/pools?token=SOL&minTvl=1000000&minApy=10
```

Response:
```json
{
  "success": true,
  "pools": [{
    "id": "POOL_ADDRESS",
    "type": "standard",
    "tokenA": {"symbol": "SOL", "address": "..."},
    "tokenB": {"symbol": "USDC", "address": "..."},
    "tvl": 15000000,
    "apr24h": 12.5,
    "volume24h": 5000000
  }]
}
```

### Get Pool Details
```bash
GET /raydium/pools/:poolId
```

### Add Liquidity ⚠️ Protected
```bash
POST /raydium/pools/add-liquidity
{
  "poolId": "POOL_ADDRESS",
  "wallet": "YOUR_WALLET",
  "amountA": "1000000000",
  "slippage": 0.5
}
```

### Remove Liquidity ⚠️ Protected
```bash
POST /raydium/pools/remove-liquidity
{
  "poolId": "POOL_ADDRESS",
  "wallet": "YOUR_WALLET",
  "lpAmount": "1500000000",
  "slippage": 0.5
}
```

---

## Lending & Vaults (Kamino)

### List Markets
```bash
GET /kamino/markets
```

### Get Reserves (with APY)
```bash
GET /kamino/reserves?token=SOL
```

### List Vaults
```bash
GET /kamino/vaults?token=USDC&minApy=10
```

### Get Positions
```bash
GET /kamino/positions?wallet=WALLET_ADDRESS
```

Response includes health: 🟢 HEALTHY / 🟡 MODERATE / 🟠 WARNING / 🔴 CRITICAL

### Deposit/Withdraw ⚠️ Protected
```bash
POST /kamino/deposit
{
  "wallet": "WALLET_ADDRESS",
  "reserve": "RESERVE_ADDRESS",
  "amount": "1000000",
  "action": "deposit"  // or "withdraw"
}
```

### Borrow/Repay ⚠️ Protected
```bash
POST /kamino/borrow
{
  "wallet": "WALLET_ADDRESS",
  "reserve": "RESERVE_ADDRESS",
  "amount": "1000000",
  "action": "borrow"  // or "repay"
}
```

⚠️ **LIQUIDATION WARNING**: Monitor LTV. If it exceeds threshold, collateral WILL be liquidated.

---

## Wallet Operations

### Check Balance
```bash
GET /wallet/balance?wallet=WALLET_ADDRESS
```

### Send Tokens ⚠️ Protected
```bash
POST /wallet/send
{
  "to": "RECIPIENT_ADDRESS",
  "amount": 0.5,
  "mint": "TOKEN_MINT"  // Optional, omit for SOL
}
```

### Get Receive Address ⚠️ Protected
```bash
GET /wallet/receive
```

### Transaction History ⚠️ Protected
```bash
GET /wallet/transactions?limit=10
```

---

## Limit Orders

### Create Order ⚠️ Protected
```bash
POST /orders
{
  "inputMint": "So111...",
  "outputMint": "EPjF...",
  "inAmount": "1000000000",
  "outAmount": "150000000"
}
```

### List Orders ⚠️ Protected
```bash
GET /orders?status=open
```

### Cancel Order ⚠️ Protected
```bash
DELETE /orders/:orderId
```

---

## Price Alerts

### Create Alert ⚠️ Protected
```bash
POST /alerts
{
  "tokenMint": "So111...",
  "tokenSymbol": "SOL",
  "condition": "above",
  "targetPrice": 200,
  "webhookUrl": "https://..."
}
```

Conditions: `above`, `below`, `change_percent`

### List Alerts ⚠️ Protected
```bash
GET /alerts?status=active
```

### Delete Alert ⚠️ Protected
```bash
DELETE /alerts/:alertId
```

---

## Common Token Mints

| Token | Mint Address |
|-------|--------------|
| SOL | So11111111111111111111111111111111111111112 |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB |
| JUP | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN |
| KMNO | KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS |

---

## Error Handling

All endpoints return:
```json
{
  "success": false,
  "error": "Description"
}
```

Status codes:
- `400` — Invalid parameters
- `401` — Invalid API key
- `429` — Rate limited (wait 60s)
- `500` — Server error
- `504` — External timeout (retry)

---

## Workflow Examples

### Swap SOL → USDC
```bash
# 1. Get quote
curl "https://solskill.ai/api/v1/jupiter/quote?inputMint=So11...&outputMint=EPjF...&amount=1000000000"

# 2. Execute swap
curl -X POST https://solskill.ai/api/v1/jupiter/swap \
  -H "x-api-key: $API_KEY" \
  -d '{"inputMint":"So11...","outputMint":"EPjF...","amount":"1000000000"}'

# 3. Sign and send returned transaction
```

### Earn Yield on USDC
```bash
# 1. Find best vault
curl "https://solskill.ai/api/v1/kamino/vaults?token=USDC&minApy=10"

# 2. Deposit
curl -X POST https://solskill.ai/api/v1/kamino/deposit \
  -H "x-api-key: $API_KEY" \
  -d '{"reserve":"...","amount":"1000000","action":"deposit"}'
```

### Provide Liquidity
```bash
# 1. Find pool
curl "https://solskill.ai/api/v1/raydium/pools?token=SOL&minApy=10"

# 2. Add liquidity
curl -X POST https://solskill.ai/api/v1/raydium/pools/add-liquidity \
  -H "x-api-key: $API_KEY" \
  -d '{"poolId":"...","amountA":"1000000000"}'
```

---

## Rate Limits

- 100 requests/minute per API key
- Rate limit headers in responses
- 429 = wait 60 seconds

---

## Platform Stats

Get real-time platform statistics:

```bash
GET /stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "agents": {"total": 47, "active24h": 28},
    "activity": {"quotes24h": 1284, "swaps24h": 156, "volumeUsd24h": 45823},
    "protocols": {
      "jupiter": {"status": "operational", "latencyMs": 280},
      "kamino": {"status": "operational", "latencyMs": 150},
      "raydium": {"status": "operational", "latencyMs": 200}
    },
    "uptime": "99.9%"
  }
}
```

---

## Lending Markets Detail

Get detailed lending market info with APY:

```bash
GET /kamino/markets?token=SOL
```

Response:
```json
{
  "success": true,
  "markets": [{
    "mint": "So11...",
    "symbol": "SOL",
    "supplyApy": 3.2,
    "borrowApy": 5.8,
    "totalSupplyUsd": 1500000,
    "totalBorrowUsd": 450000,
    "utilization": 30,
    "maxLtv": 75,
    "liquidationThreshold": 80
  }]
}
```

---

## Support

- Live Demo: https://solskill.ai (try swap quotes without auth!)
- Interactive API Docs: https://solskill.ai/docs
- Dashboard: https://solskill.ai/dashboard
- GitHub: https://github.com/caiovicentino/solskill
