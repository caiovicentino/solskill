---
name: solskill
version: 1.0.0
description: DeFi Skills for AI Agents on Solana - Jupiter swaps, Kamino lending & vaults
homepage: https://solskill.ai
metadata: {"category": "defi", "chain": "solana", "api_base": "https://solskill.ai/api/v1"}
---

# SolSkill DeFi Skills

You have access to DeFi operations on Solana via the SolSkill API.

## Base URL
```
https://solskill.ai/api/v1
```

## Authentication

Protected endpoints require an API key. Include it in your request:

```bash
# Option 1: x-api-key header (recommended)
curl -H "x-api-key: solskill_your_api_key_here" ...

# Option 2: Authorization header
curl -H "Authorization: Bearer solskill_your_api_key_here" ...
```

### Public Endpoints (no auth required)
- `GET /jupiter/tokens`
- `GET /jupiter/quote`
- `GET /raydium/quote`
- `GET /kamino/markets`
- `GET /kamino/reserves`
- `GET /kamino/vaults`
- `GET /kamino/positions`
- `GET /wallet/balance`

### Protected Endpoints (API key required)
- `POST /jupiter/swap`
- `POST /raydium/swap`
- `POST /kamino/deposit`
- `POST /kamino/borrow`
- `POST /wallet/send` - Send SOL or SPL tokens
- `GET /wallet/receive` - Get deposit address + QR code
- `GET /wallet/transactions` - Get recent transactions

## Rate Limits
- 100 requests per minute per API key/IP
- Rate limit headers included in responses

---

## Quick Start: Agent Self-Registration

Agents can register themselves to get API credentials without human intervention.

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

### 2. Claim Flow
The `claim_url` is a one-time link for human authorization:

1. **Agent registers** → receives `claim_url`
2. **Human visits** `claim_url` in browser
3. **Human connects wallet** and approves the agent
4. **Page displays API key** for the human to provide to agent
5. **Agent stores credentials** locally

### 3. Store Credentials
Save your API key to the standard location:

```bash
mkdir -p ~/.config/solskill
cat > ~/.config/solskill/credentials.json << 'EOF'
{
  "api_key": "solskill_your_api_key_here",
  "agent_id": "agent_abc123",
  "registered_at": "2025-01-15T12:00:00Z"
}
EOF
chmod 600 ~/.config/solskill/credentials.json
```

### 4. Use Credentials
```bash
# Read API key from stored credentials
API_KEY=$(jq -r .api_key ~/.config/solskill/credentials.json)

# Use in requests
curl -H "x-api-key: $API_KEY" https://solskill.ai/api/v1/jupiter/swap ...
```

### ⚠️ Security Warnings

- **Never commit credentials** to git or share publicly
- **claim_url expires** after 1 hour - register again if expired
- **One claim per registration** - URL becomes invalid after use
- **Credentials grant financial access** - protect like private keys
- **Set file permissions** to 600 (owner read/write only)
- **Rotate keys** if you suspect compromise via `/api/v1/agents/rotate`

---

## Available Skills

### 1. Token List
Get popular token mints for swaps.
```bash
GET /jupiter/tokens
GET /jupiter/tokens?all=true  # Include all verified tokens
```

### 2. Swap Quote
Get a quote for token swap.
```bash
GET /jupiter/quote?inputMint=SOL_MINT&outputMint=USDC_MINT&amount=LAMPORTS
```
Parameters:
- `inputMint`: Token to sell (mint address)
- `outputMint`: Token to buy (mint address)
- `amount`: Amount in smallest unit (lamports for SOL)
- `slippageBps`: Slippage tolerance in bps (default: 50 = 0.5%, max: 5000)

### 3. Execute Swap (Jupiter) ⚠️ Protected
Build swap transaction via Jupiter aggregator.
```bash
POST /jupiter/swap
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "userPublicKey": "YOUR_WALLET_ADDRESS",
  "slippageBps": 50
}
```
Returns base64-encoded transaction to sign and send.

### 3b. Raydium Swap Quote
Get a quote from Raydium DEX.
```bash
GET /raydium/quote?inputMint=SOL_MINT&outputMint=USDC_MINT&amount=LAMPORTS
```
Parameters:
- `inputMint`: Token to sell (mint address)
- `outputMint`: Token to buy (mint address)
- `amount`: Amount in smallest unit (lamports for SOL)
- `slippageBps`: Slippage tolerance in bps (default: 50, max: 5000)

Response:
```json
{
  "success": true,
  "inputMint": "So11...",
  "outputMint": "EPjF...",
  "inAmount": "1000000000",
  "outAmount": "98733987",
  "priceImpact": 0,
  "route": [{"poolId": "...", "inputMint": "...", "outputMint": "..."}]
}
```

### 3c. Execute Swap (Raydium) ⚠️ Protected
Build swap transaction via Raydium DEX.
```bash
POST /raydium/swap
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "userPublicKey": "YOUR_WALLET_ADDRESS",
  "slippageBps": 50,
  "computeUnitPriceMicroLamports": 50000
}
```
Returns array of base64-encoded versioned transactions to sign and send in order.

### 4. Check Wallet Balance
```bash
GET /wallet/balance?wallet=WALLET_ADDRESS
```

### 5. Send Tokens ⚠️ Protected
Transfer SOL or SPL tokens to another wallet.
```bash
POST /wallet/send
{
  "to": "RECIPIENT_WALLET_ADDRESS",
  "amount": 0.5,
  "mint": "TOKEN_MINT_ADDRESS"  // Optional - omit for SOL
}
```
Parameters:
- `to`: Recipient wallet address (required)
- `amount`: Amount to send in human-readable units (required)
- `mint`: Token mint address (optional - omit or use SOL mint for native SOL)

Response:
```json
{
  "success": true,
  "type": "sol",
  "transaction": "BASE64_ENCODED_TRANSACTION",
  "from": "YOUR_WALLET",
  "to": "RECIPIENT_WALLET",
  "amount": 0.5,
  "amountLamports": "500000000",
  "lastValidBlockHeight": 123456789
}
```
Returns base64-encoded transaction to sign and send.

### 6. Get Receive Address ⚠️ Protected
Get your agent's wallet address for receiving deposits.
```bash
GET /wallet/receive
```
Response:
```json
{
  "success": true,
  "wallet": "YOUR_WALLET_ADDRESS",
  "deposit": {
    "address": "YOUR_WALLET_ADDRESS",
    "solanaPayUrl": "solana:YOUR_WALLET_ADDRESS",
    "qrCode": {
      "solanaPayQr": "https://api.qrserver.com/...",
      "addressQr": "https://api.qrserver.com/..."
    }
  },
  "explorer": "https://solscan.io/account/YOUR_WALLET"
}
```

### 7. Get Transactions ⚠️ Protected
Get recent transaction history for your agent's wallet.
```bash
GET /wallet/transactions?limit=10&before=SIGNATURE
```
Parameters:
- `limit`: Number of transactions to return (1-50, default: 10)
- `before`: Signature to paginate from (for older transactions)

Response:
```json
{
  "success": true,
  "wallet": "YOUR_WALLET",
  "transactions": [
    {
      "signature": "5UJr...",
      "blockTime": 1706000000,
      "timestamp": "2024-01-23T12:00:00.000Z",
      "status": "success",
      "fee": 5000,
      "feeSol": "0.000005000",
      "type": "transfer",
      "description": "Received 1.5 SOL",
      "changes": {
        "sol": { "before": 2.0, "after": 3.5, "change": 1.5 }
      }
    }
  ],
  "count": 10,
  "hasMore": true,
  "pagination": {
    "limit": 10,
    "nextBefore": "LAST_SIGNATURE"
  }
}
```

### 8. Kamino Markets
Get lending market info.
```bash
GET /kamino/markets
```

### 6. Kamino Reserves (Lending Pools)
Get reserves with supply/borrow APY.
```bash
GET /kamino/reserves
GET /kamino/reserves?token=SOL  # Filter by token
```

### 7. Kamino Vaults (Yield Strategies)
Get yield vaults sorted by APY.
```bash
GET /kamino/vaults
GET /kamino/vaults?token=SOL&minApy=10  # Filter
```

### 8. User Positions
Get user's lending and vault positions with health status.
```bash
GET /kamino/positions?wallet=WALLET_ADDRESS
```
Response includes health indicator: 🟢 HEALTHY / 🟡 MODERATE / 🟠 WARNING / 🔴 CRITICAL

### 9. Deposit to Lending ⚠️ Protected
Deposit tokens to earn yield.
```bash
POST /kamino/deposit
{
  "wallet": "WALLET_ADDRESS",
  "reserve": "RESERVE_ADDRESS",
  "amount": "AMOUNT_IN_SMALLEST_UNIT",
  "action": "deposit"  // or "withdraw"
}
```

### 10. Borrow from Lending ⚠️ Protected
Borrow against collateral.
```bash
POST /kamino/borrow
{
  "wallet": "WALLET_ADDRESS",
  "reserve": "RESERVE_ADDRESS",
  "amount": "AMOUNT_IN_SMALLEST_UNIT",
  "action": "borrow"  // or "repay"
}
```

⚠️ **LIQUIDATION WARNING**: Borrowing increases your LTV. If LTV exceeds liquidation threshold, collateral WILL be liquidated. Monitor positions regularly!

---

## Common Token Mints

| Token | Mint |
|-------|------|
| SOL | So11111111111111111111111111111111111111112 |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB |
| JUP | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN |
| KMNO | KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS |

---

## Workflow Examples

### Swap SOL to USDC (Jupiter)
1. `GET /jupiter/quote?inputMint=So11...&outputMint=EPjF...&amount=1000000000`
2. `POST /jupiter/swap` with inputMint, outputMint, amount, userPublicKey
3. Sign and send the returned transaction

### Swap SOL to USDC (Raydium)
1. `GET /raydium/quote?inputMint=So11...&outputMint=EPjF...&amount=1000000000`
2. `POST /raydium/swap` with inputMint, outputMint, amount, userPublicKey
3. Sign and send each returned transaction in order

### Earn Yield on SOL
1. `GET /kamino/reserves?token=SOL` - Find SOL reserve and APY
2. `POST /kamino/deposit` with reserve address and amount
3. Monitor with `GET /kamino/positions?wallet=...`

### Find Best Yields
1. `GET /kamino/vaults?minApy=20` - Vaults with >20% APY
2. Review risks and choose vault
3. Deposit via SDK (see response instructions)

### Monitor Health
1. `GET /kamino/positions?wallet=YOUR_WALLET`
2. Check `healthStatus` field for each position
3. If 🟠 or 🔴, consider repaying debt or adding collateral

---

## Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

Common status codes:
- `400` - Invalid parameters
- `401` - Missing or invalid API key
- `429` - Rate limit exceeded (wait 60s)
- `500` - Server error
- `504` - External API timeout (retry)

---

## Limit Orders

Set buy/sell orders that execute when price reaches your target.

### Create Limit Order ⚠️ Protected
```bash
POST /orders
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "inAmount": "1000000000",
  "outAmount": "150000000",
  "expiry": 1735689600
}
```
Response:
```json
{
  "success": true,
  "order": {
    "id": "order_123456",
    "inputMint": "So11...",
    "outputMint": "EPjF...",
    "inAmount": "1000000000",
    "outAmount": "150000000",
    "limitPrice": 0.15,
    "status": "open",
    "createdAt": "2026-02-04T00:00:00Z"
  }
}
```

### List Orders ⚠️ Protected
```bash
GET /orders
GET /orders?status=open
GET /orders?status=filled
GET /orders?status=cancelled
```

### Get Specific Order ⚠️ Protected
```bash
GET /orders/order_123456
```

### Cancel Order ⚠️ Protected
```bash
DELETE /orders/order_123456
```

### Cancel All Orders ⚠️ Protected
```bash
DELETE /orders
```

---

## Price Alerts

Get notified when tokens hit your target price.

### Create Alert ⚠️ Protected
```bash
POST /alerts
{
  "tokenMint": "So11111111111111111111111111111111111111112",
  "tokenSymbol": "SOL",
  "condition": "above",
  "targetPrice": 200,
  "webhookUrl": "https://your-webhook.com/notify",
  "repeat": false
}
```
Conditions:
- `above` - Triggers when price goes above targetPrice
- `below` - Triggers when price goes below targetPrice
- `change_percent` - Triggers on % change (use `changePercent` and `timeframe`)

Response:
```json
{
  "success": true,
  "alert": {
    "id": "alert_789xyz",
    "tokenMint": "So11...",
    "tokenSymbol": "SOL",
    "condition": "above",
    "targetPrice": 200,
    "status": "active",
    "createdAt": "2026-02-04T00:00:00Z"
  }
}
```

### List Alerts ⚠️ Protected
```bash
GET /alerts
GET /alerts?status=active
GET /alerts?status=triggered
```

### Get Specific Alert ⚠️ Protected
```bash
GET /alerts/alert_789xyz
```

### Update Alert ⚠️ Protected
```bash
PATCH /alerts/alert_789xyz
{
  "status": "disabled",
  "targetPrice": 250
}
```

### Delete Alert ⚠️ Protected
```bash
DELETE /alerts/alert_789xyz
```

### Delete All Alerts ⚠️ Protected
```bash
DELETE /alerts
```

---

## Support

- Docs: https://solskill.ai
- GitHub: https://github.com/caiovicentino/solskill
