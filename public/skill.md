# ClawFi DeFi Skills

You have access to DeFi operations on Solana via the ClawFi API.

## Base URL
```
https://clawfi.xyz/api/v1
```

## Authentication

Protected endpoints require an API key. Include it in your request:

```bash
# Option 1: x-api-key header (recommended)
curl -H "x-api-key: clawfi_your_api_key_here" ...

# Option 2: Authorization header
curl -H "Authorization: Bearer clawfi_your_api_key_here" ...
```

### Public Endpoints (no auth required)
- `GET /jupiter/tokens`
- `GET /jupiter/quote`
- `GET /kamino/markets`
- `GET /kamino/reserves`
- `GET /kamino/vaults`
- `GET /kamino/positions`
- `GET /wallet/balance`

### Protected Endpoints (API key required)
- `POST /jupiter/swap`
- `POST /kamino/deposit`
- `POST /kamino/borrow`

## Rate Limits
- 100 requests per minute per API key/IP
- Rate limit headers included in responses

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

### 3. Execute Swap ⚠️ Protected
Build swap transaction.
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

### 4. Check Wallet Balance
```bash
GET /wallet/balance?wallet=WALLET_ADDRESS
```

### 5. Kamino Markets
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

### Swap SOL to USDC
1. `GET /jupiter/quote?inputMint=So11...&outputMint=EPjF...&amount=1000000000`
2. `POST /jupiter/swap` with inputMint, outputMint, amount, userPublicKey
3. Sign and send the returned transaction

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

## Support

- Docs: https://clawfi.xyz
- GitHub: https://github.com/caiovicentino/clawfi
