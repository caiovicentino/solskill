---
name: solskill
version: 2.0.0
description: DeFi Skills for AI Agents on Solana - Swaps, Lending, Vaults, LP, Strategy Engine, Risk Scoring, Simulation
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
- `GET /kamino/markets` — Lending markets
- `GET /kamino/reserves` — Reserves with APY
- `GET /kamino/vaults` — Yield vaults
- `GET /kamino/positions` — User positions
- `GET /wallet/balance` — Wallet balances
- `GET /stats` — Platform statistics
- `GET /health` — Protocol health check
- `GET /risk/score` — Risk assessment
- `GET /yields/best` — Best yield opportunities
- `POST /strategies/recommend` — Strategy recommendations
- `POST /simulate` — Dry-run simulation

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
  "agent": {
    "id": "uuid",
    "name": "YourAgentName",
    "api_key": "solskill_...",
    "verified": true
  },
  "important": "SAVE YOUR API KEY!"
}
```

### 2. Store Credentials
```bash
mkdir -p ~/.config/solskill
cat > ~/.config/solskill/credentials.json << 'EOF'
{
  "api_key": "solskill_your_api_key_here",
  "agent_id": "your_agent_id"
}
EOF
chmod 600 ~/.config/solskill/credentials.json
```

### 3. Use in Requests
```bash
API_KEY=$(jq -r .api_key ~/.config/solskill/credentials.json)
curl -H "x-api-key: $API_KEY" https://solskill.ai/api/v1/...
```

---

## Strategy Engine (NEW)

### Get Strategy Recommendation
```bash
POST /strategies/recommend
{
  "goal": "maximize yield",
  "risk": "medium",
  "amount": 1000,
  "token": "USDC"
}
```

Response:
```json
{
  "success": true,
  "strategy": {
    "totalEstimatedApy": 12.5,
    "riskScore": 35,
    "allocations": [
      {
        "protocol": "Kamino Vaults",
        "action": "deposit",
        "allocation": 40,
        "amountUsd": 400,
        "estimatedApy": 15.2,
        "riskLevel": "medium",
        "endpoint": "POST /api/v1/kamino/deposit"
      }
    ]
  }
}
```

Risk levels: `low`, `medium`, `high`

---

## Simulation Mode (NEW)

### Simulate Any Operation
```bash
POST /simulate
{
  "operation": "swap",
  "params": {
    "inputMint": "SOL",
    "outputMint": "USDC",
    "amount": "1000000000",
    "slippageBps": 50
  }
}
```

Supported operations: `swap`, `deposit`, `withdraw`, `add-liquidity`

Response includes:
- Expected output amounts
- Price impact
- Fee breakdown
- Risk assessment
- Endpoint to execute

### Simulate Lending Deposit
```bash
POST /simulate
{
  "operation": "deposit",
  "params": {
    "token": "USDC",
    "amount": 1000
  }
}
```

Returns projected yield (daily/monthly/yearly) using real APY data.

---

## Risk Score (NEW)

### Assess Risk for Any Action
```bash
GET /risk/score?protocol=kamino&action=deposit&token=SOL&amount=100
```

Parameters:
- `protocol` — kamino, raydium, jupiter
- `action` — deposit, withdraw, borrow, swap, lp, add-liquidity
- `token` — Token symbol (SOL, USDC, etc.)
- `amount` — Position size

Response:
```json
{
  "success": true,
  "risk": {
    "overallScore": 22,
    "riskLevel": "MODERATE",
    "breakdown": [
      {"category": "Smart Contract", "score": 10, "weight": 35, "detail": "3 audits..."},
      {"category": "Liquidation", "score": 5, "weight": 28, "detail": "Supply-side only..."},
      {"category": "Protocol TVL & Maturity", "score": 10, "weight": 21, "detail": "TVL: $500M+..."},
      {"category": "Historical Performance", "score": 15, "weight": 14, "detail": "No incidents..."}
    ],
    "recommendation": "Acceptable risk level for most portfolios."
  }
}
```

---

## Health Monitor (NEW)

### Check Platform & Protocol Health
```bash
GET /health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "solana": {
    "network": "mainnet-beta",
    "tps": 3500,
    "rpcLatencyMs": 85,
    "slotTimeMs": 400,
    "medianPriorityFeeMicroLamports": 1000
  },
  "protocols": [
    {"name": "Jupiter", "status": "operational", "responseTimeMs": 280},
    {"name": "Kamino", "status": "operational", "responseTimeMs": 150},
    {"name": "Raydium", "status": "operational", "responseTimeMs": 200},
    {"name": "DefiLlama", "status": "operational", "responseTimeMs": 120}
  ],
  "solskill": {
    "version": "2.0.0",
    "endpoints": 35,
    "uptime": "99.9%"
  }
}
```

---

## Yield Optimizer (NEW)

### Find Best Yields Across All Protocols
```bash
GET /yields/best?token=USDC&minApy=5&maxRisk=medium&limit=10
```

Parameters:
- `token` — Filter by token symbol
- `minApy` — Minimum APY threshold
- `maxRisk` — Maximum risk level (low, medium, high)
- `limit` — Max results (default 20, max 50)

Response:
```json
{
  "success": true,
  "yields": [
    {
      "protocol": "kamino-lend",
      "type": "lending",
      "token": "USDC",
      "apy": 8.5,
      "tvlUsd": 150000000,
      "riskLevel": "low",
      "endpoint": "POST /api/v1/kamino/deposit"
    }
  ],
  "source": "defillama"
}
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

### Execute Swap (Protected)
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

### Execute Swap (Protected)
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

### Get Pool Details
```bash
GET /raydium/pools/:poolId
```

### Add Liquidity (Protected)
```bash
POST /raydium/pools/add-liquidity
{
  "poolId": "POOL_ADDRESS",
  "wallet": "YOUR_WALLET",
  "amountA": "1000000000",
  "slippage": 0.5
}
```

### Remove Liquidity (Protected)
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

### Deposit/Withdraw (Protected)
```bash
POST /kamino/deposit
{
  "wallet": "WALLET_ADDRESS",
  "reserve": "RESERVE_ADDRESS",
  "amount": "1000000",
  "action": "deposit"
}
```

### Borrow/Repay (Protected)
```bash
POST /kamino/borrow
{
  "wallet": "WALLET_ADDRESS",
  "reserve": "RESERVE_ADDRESS",
  "amount": "1000000",
  "action": "borrow"
}
```

---

## Wallet Operations

### Check Balance
```bash
GET /wallet/balance?wallet=WALLET_ADDRESS
```

### Send Tokens (Protected)
```bash
POST /wallet/send
{
  "to": "RECIPIENT_ADDRESS",
  "amount": 0.5,
  "mint": "TOKEN_MINT"
}
```

### Get Receive Address (Protected)
```bash
GET /wallet/receive
```

### Transaction History (Protected)
```bash
GET /wallet/transactions?limit=10
```

---

## Limit Orders

### Create Order (Protected)
```bash
POST /orders
{
  "inputMint": "So111...",
  "outputMint": "EPjF...",
  "inAmount": "1000000000",
  "outAmount": "150000000"
}
```

### List Orders (Protected)
```bash
GET /orders?status=open
```

### Cancel Order (Protected)
```bash
DELETE /orders/:orderId
```

---

## Price Alerts

### Create Alert (Protected)
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

### List Alerts (Protected)
```bash
GET /alerts?status=active
```

### Delete Alert (Protected)
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

## Workflow Examples

### Smart Yield Strategy
```bash
# 1. Get personalized strategy
curl -X POST https://solskill.ai/api/v1/strategies/recommend \
  -d '{"goal":"maximize yield","risk":"medium","amount":1000,"token":"USDC"}'

# 2. Simulate before executing
curl -X POST https://solskill.ai/api/v1/simulate \
  -d '{"operation":"deposit","params":{"token":"USDC","amount":400}}'

# 3. Check risk
curl "https://solskill.ai/api/v1/risk/score?protocol=kamino&action=deposit&token=USDC&amount=400"

# 4. Execute (with API key)
curl -X POST https://solskill.ai/api/v1/kamino/deposit \
  -H "x-api-key: $API_KEY" \
  -d '{"reserve":"...","amount":"400000000","action":"deposit"}'
```

### Swap SOL to USDC
```bash
# 1. Simulate first
curl -X POST https://solskill.ai/api/v1/simulate \
  -d '{"operation":"swap","params":{"inputMint":"SOL","outputMint":"USDC","amount":"1000000000"}}'

# 2. Get real quote
curl "https://solskill.ai/api/v1/jupiter/quote?inputMint=So11...&outputMint=EPjF...&amount=1000000000"

# 3. Execute swap
curl -X POST https://solskill.ai/api/v1/jupiter/swap \
  -H "x-api-key: $API_KEY" \
  -d '{"inputMint":"So11...","outputMint":"EPjF...","amount":"1000000000","userPublicKey":"WALLET"}'
```

### Find Best Yields
```bash
# 1. Get best opportunities
curl "https://solskill.ai/api/v1/yields/best?token=USDC&minApy=5&maxRisk=medium"

# 2. Check health of protocols
curl "https://solskill.ai/api/v1/health"

# 3. Assess risk
curl "https://solskill.ai/api/v1/risk/score?protocol=kamino&action=deposit&token=USDC&amount=1000"
```

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
- `502` — External API error
- `504` — External timeout (retry)

---

## Rate Limits

- 100 requests/minute per API key
- Rate limit headers in responses
- 429 = wait 60 seconds

---

## Support

- Docs: https://solskill.ai
- Dashboard: https://solskill.ai/dashboard
- GitHub: https://github.com/caiovicentino/solskill
