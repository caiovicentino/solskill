# ClawFi Skill Specification

ClawFi provides DeFi capabilities for AI agents on Solana.

## Base URL
```
https://clawfi.xyz/api/v1
```

## Authentication
Protected endpoints require an API key via header:
```
x-api-key: clawfi_YOUR_API_KEY
```
Or:
```
Authorization: Bearer clawfi_YOUR_API_KEY
```

---

## Agent Management

### Register Agent
```
POST /agents/register
```
Create a new agent with embedded wallet.

**Body:**
```json
{
  "name": "my-agent",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent_...",
  "apiKey": "clawfi_...",
  "claimCode": "claim_...",
  "status": "pending_claim"
}
```

---

## Jupiter (Token Swaps)

### List Tokens
```
GET /jupiter/tokens
```
Get available tokens for swapping.

### Get Quote
```
GET /jupiter/quote?inputMint=...&outputMint=...&amount=...&slippageBps=50
```

### Execute Swap
```
POST /jupiter/swap
```
**Auth Required**

**Body:**
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "userPublicKey": "YOUR_WALLET",
  "slippageBps": 50
}
```

---

## Kamino Finance (Lending)

### List Markets
```
GET /kamino/markets
```

### Get Reserves
```
GET /kamino/reserves?market=MARKET_ADDRESS
```

### List Vaults
```
GET /kamino/vaults?token=USDC&minApy=5
```

### Deposit/Withdraw
```
POST /kamino/deposit
```
**Auth Required**

**Body:**
```json
{
  "wallet": "YOUR_WALLET",
  "reserve": "RESERVE_ADDRESS",
  "amount": "1000000",
  "market": "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  "action": "deposit"
}
```

### Borrow/Repay
```
POST /kamino/borrow
```
**Auth Required**

**Body:**
```json
{
  "wallet": "YOUR_WALLET",
  "reserve": "RESERVE_ADDRESS",
  "amount": "1000000",
  "action": "borrow"
}
```

---

## Raydium (Liquidity Pools)

### List Pools
```
GET /raydium/pools
```
List available liquidity pools with TVL, APY, and token info.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `token` | string | Filter by token symbol (e.g., SOL, USDC) |
| `minTvl` | number | Minimum TVL in USD |
| `minApy` | number | Minimum APY percentage |
| `type` | string | Pool type: all, standard, concentrated |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Results per page (max: 100) |

**Response:**
```json
{
  "success": true,
  "pools": [
    {
      "id": "POOL_ADDRESS",
      "type": "standard",
      "tokenA": {
        "symbol": "SOL",
        "address": "So111...",
        "decimals": 9
      },
      "tokenB": {
        "symbol": "USDC",
        "address": "EPjFW...",
        "decimals": 6
      },
      "tvl": 15000000,
      "apr24h": 12.5,
      "volume24h": 5000000,
      "feeRate": 0.0025
    }
  ],
  "count": 50
}
```

### Get Pool Details
```
GET /raydium/pools/:poolId
```
Get detailed information for a specific pool.

**Response:**
```json
{
  "success": true,
  "pool": {
    "id": "POOL_ADDRESS",
    "type": "standard",
    "mintA": {
      "address": "So111...",
      "symbol": "SOL",
      "decimals": 9
    },
    "mintB": {
      "address": "EPjFW...",
      "symbol": "USDC",
      "decimals": 6
    },
    "mintAmountA": "100000",
    "mintAmountB": "15000000",
    "price": 150,
    "tvl": 15000000,
    "apr": {
      "day": 12.5,
      "week": 11.2,
      "month": 10.8
    },
    "feeApr": {
      "day": 8.5,
      "week": 7.8,
      "month": 7.2
    },
    "rewardApr": {
      "day": 4.0,
      "week": 3.4,
      "month": 3.6
    },
    "feeRate": 0.0025,
    "lpMint": {
      "address": "LP_MINT_ADDRESS",
      "decimals": 9
    },
    "lpPrice": 1.5,
    "lpAmount": "10000000",
    "farmCount": 2
  }
}
```

### Add Liquidity
```
POST /raydium/pools/add-liquidity
```
**Auth Required**

Add liquidity to a Raydium pool.

**Body:**
```json
{
  "poolId": "POOL_ADDRESS",
  "wallet": "YOUR_WALLET",
  "amountA": "1000000000",
  "amountB": "150000000",
  "slippage": 0.5,
  "fixedSide": "a"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `poolId` | string | Yes | Pool address |
| `wallet` | string | Yes | User wallet address |
| `amountA` | string | One required | Amount of token A (raw units) |
| `amountB` | string | One required | Amount of token B (raw units) |
| `slippage` | number | No | Slippage tolerance % (default: 0.5) |
| `fixedSide` | string | No | Which side is fixed: "a" or "b" |

**Response (Transaction Ready):**
```json
{
  "success": true,
  "transaction": "BASE64_ENCODED_TX",
  "estimatedLpTokens": "1500000000",
  "computed": {
    "amountA": "1000000000",
    "amountB": "150000000",
    "minAmountA": "995000000",
    "minAmountB": "149250000",
    "lpAmount": "1500000000"
  },
  "pool": {
    "id": "POOL_ADDRESS",
    "tokenA": "SOL",
    "tokenB": "USDC"
  }
}
```

**Response (Manual Build Required):**
```json
{
  "success": true,
  "requiresManualBuild": true,
  "params": {
    "poolId": "...",
    "wallet": "...",
    "amountA": 1.0,
    "amountB": 150.0,
    "slippage": 0.5
  },
  "pool": {
    "tokenA": { "symbol": "SOL", "address": "...", "decimals": 9 },
    "tokenB": { "symbol": "USDC", "address": "...", "decimals": 6 },
    "lpMint": "...",
    "programId": "..."
  },
  "instructions": {
    "sdk": "@raydium-io/raydium-sdk-v2",
    "steps": ["..."],
    "example": "...",
    "docs": "https://docs.raydium.io/raydium/traders/sdks"
  }
}
```

### Remove Liquidity
```
POST /raydium/pools/remove-liquidity
```
**Auth Required**

Remove liquidity from a Raydium pool.

**Body:**
```json
{
  "poolId": "POOL_ADDRESS",
  "wallet": "YOUR_WALLET",
  "lpAmount": "1500000000",
  "slippage": 0.5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `poolId` | string | Yes | Pool address |
| `wallet` | string | Yes | User wallet address |
| `lpAmount` | string | Yes | Amount of LP tokens to burn |
| `slippage` | number | No | Slippage tolerance % (default: 0.5) |

**Response (Transaction Ready):**
```json
{
  "success": true,
  "transaction": "BASE64_ENCODED_TX",
  "estimated": {
    "amountA": "1000000000",
    "amountB": "150000000",
    "minAmountA": "995000000",
    "minAmountB": "149250000"
  },
  "pool": {
    "id": "POOL_ADDRESS",
    "tokenA": "SOL",
    "tokenB": "USDC"
  }
}
```

**Response (Manual Build Required):**
```json
{
  "success": true,
  "requiresManualBuild": true,
  "params": {
    "poolId": "...",
    "wallet": "...",
    "lpAmount": "1500000000",
    "slippage": 0.5
  },
  "estimated": {
    "amountA": 1.0,
    "amountB": 150.0,
    "minAmountA": 0.995,
    "minAmountB": 149.25,
    "lpShare": 0.001
  },
  "pool": {
    "tokenA": { "symbol": "SOL", "address": "...", "decimals": 9 },
    "tokenB": { "symbol": "USDC", "address": "...", "decimals": 6 },
    "lpMint": "...",
    "tvl": 15000000,
    "totalLpSupply": "1500000000000"
  },
  "instructions": {
    "sdk": "@raydium-io/raydium-sdk-v2",
    "steps": ["..."],
    "example": "...",
    "docs": "https://docs.raydium.io/raydium/traders/sdks"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |
| 504 | Timeout - External API timeout |

---

## Example: Provide Liquidity Workflow

```javascript
// 1. Find a good pool
const pools = await fetch('/api/v1/raydium/pools?token=SOL&minTvl=1000000')
  .then(r => r.json());

const bestPool = pools.pools[0];
console.log(`Pool: ${bestPool.tokenA.symbol}/${bestPool.tokenB.symbol}`);
console.log(`APR: ${bestPool.apr24h}%, TVL: $${bestPool.tvl}`);

// 2. Get pool details
const poolDetails = await fetch(`/api/v1/raydium/pools/${bestPool.id}`)
  .then(r => r.json());

// 3. Add liquidity
const addLiqRes = await fetch('/api/v1/raydium/pools/add-liquidity', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'clawfi_YOUR_KEY'
  },
  body: JSON.stringify({
    poolId: bestPool.id,
    wallet: 'YOUR_WALLET',
    amountA: '1000000000', // 1 SOL
    slippage: 0.5
  })
}).then(r => r.json());

// 4. Sign and send the transaction
// (use @solana/web3.js to deserialize, sign, and send)

// 5. Later, remove liquidity
const removeLiqRes = await fetch('/api/v1/raydium/pools/remove-liquidity', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'clawfi_YOUR_KEY'
  },
  body: JSON.stringify({
    poolId: bestPool.id,
    wallet: 'YOUR_WALLET',
    lpAmount: addLiqRes.estimatedLpTokens,
    slippage: 0.5
  })
}).then(r => r.json());
```

---

## Notes

- All amounts are in raw token units (lamports for SOL, smallest unit for SPL tokens)
- Slippage is specified as a percentage (0.5 = 0.5%)
- Transaction responses are base64-encoded versioned transactions
- When `requiresManualBuild: true`, use the provided SDK instructions to build locally
