# 🛠️ SolSkill — DeFi Skills for AI Agents

> **Give your AI agent a wallet. Let it trade, lend, and earn yield on Solana.**

[![Live Demo](https://img.shields.io/badge/🚀_Demo-solskill.ai-9945FF?style=for-the-badge)](https://solskill.ai)
[![Skill Spec](https://img.shields.io/badge/📋_Skill_Spec-skill.md-14F195?style=for-the-badge)](https://solskill.ai/skill.md)
[![API Docs](https://img.shields.io/badge/📚_API_Docs-Interactive-blue?style=for-the-badge)](https://solskill.ai/docs)
[![Built on Solana](https://img.shields.io/badge/Built_on-Solana-black?style=for-the-badge&logo=solana)](https://solana.com)

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-14F195?style=flat-square" />
  <img src="https://img.shields.io/badge/Agents-47+-9945FF?style=flat-square" />
  <img src="https://img.shields.io/badge/Endpoints-15+-00FFA3?style=flat-square" />
  <img src="https://img.shields.io/badge/Hackathon-Solana_AI_2026-black?style=flat-square" />
</p>

---

## 🎬 Try It Now!

**No signup needed** — Test real Jupiter quotes directly on our site:

👉 **[Live Swap Demo](https://solskill.ai)** — Get real-time swap quotes  
👉 **[Interactive API Docs](https://solskill.ai/docs)** — Run API calls in your browser  
👉 **[Skill File](https://solskill.ai/skill.md)** — Give this to your AI agent

---

## 🎯 What is SolSkill?

SolSkill is a **skill layer** that enables AI agents to perform **self-custodial DeFi operations** on Solana. No shared keys, no centralized custody—each agent gets its own embedded wallet powered by Privy.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    AI Agent     │────▶│     SolSkill     │────▶│  Solana DeFi    │
│  (Claude, GPT,  │     │   Skill Layer    │     │ Jupiter, Kamino │
│   Custom, etc)  │     │  + Privy Wallet  │     │ Raydium, etc    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Why SolSkill?

- 🔐 **Self-Custodial** — Each agent has its own embedded wallet. No shared keys.
- 🤖 **Agent-First** — Designed for autonomous registration and operation
- 👤 **Human Override** — Claim system allows humans to supervise when needed
- 📊 **Real-Time Dashboard** — Monitor all agent activity and positions
- 📝 **Audit Trail** — Complete logging for compliance and debugging

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔄 **Token Swaps** | Trade via Jupiter aggregator with best prices |
| 🏦 **Lending & Borrowing** | Deposit, borrow, and earn yield on Kamino Finance |
| 📈 **Yield Vaults** | Access automated DeFi strategies |
| 💰 **Portfolio Management** | Track balances across Solana DeFi |
| 📝 **Limit Orders** | Set buy/sell orders at target prices |
| 🔔 **Price Alerts** | Get notified when tokens hit your targets |
| 💧 **Liquidity Pools** | Provide liquidity on Raydium |

---

## 🚀 Quick Start for Agents

### 1. Register Your Agent

```bash
curl -X POST https://solskill.ai/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "my-trading-agent", "description": "Automated DeFi trader"}'
```

**Response:**
```json
{
  "success": true,
  "agent_id": "agent_abc123",
  "claim_url": "https://solskill.ai/claim/abc123xyz",
  "expires_in": 3600,
  "message": "Have your human visit claim_url to authorize"
}
```

### 2. Human Claims the Agent

Human visits `claim_url` → connects wallet → approves → receives API key.

### 3. Start Trading!

```bash
# Get a swap quote
curl "https://solskill.ai/api/v1/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000"

# Execute the swap
curl -X POST https://solskill.ai/api/v1/jupiter/swap \
  -H "x-api-key: solskill_..." \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "1000000000",
    "slippageBps": 50
  }'
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         SolSkill                               │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Next.js    │  │    Privy     │  │     Solana RPC       │ │
│  │   Frontend   │  │   Wallets    │  │   (Helius/Triton)    │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                      API Layer (/api/v1)                       │
├────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  Jupiter   │  │   Kamino   │  │  Raydium   │  │  Wallet  │ │
│  │   Swaps    │  │  Lending   │  │   Pools    │  │  Mgmt    │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
├────────────────────────────────────────────────────────────────┤
│                        Protocols                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  Jupiter   │  │   Kamino   │  │  Raydium   │               │
│  │    DEX     │  │  Finance   │  │    AMM     │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **Auth & Wallets** | Privy Embedded Wallets |
| **Blockchain** | Solana (Mainnet) |
| **DEX Aggregation** | Jupiter v6 API |
| **Lending Protocol** | Kamino Finance |
| **Liquidity Pools** | Raydium |
| **Deployment** | Vercel |

---

## 📖 API Endpoints

### Agent Management
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/agents/register` | POST | - | Create a new agent wallet |
| `/api/v1/claim/:code/info` | GET | - | Get claim info |
| `/api/v1/claim/:code/verify-tweet` | POST | - | Verify claim tweet |

### Wallet Operations
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/wallet/balance` | GET | - | Get wallet balances |
| `/api/v1/wallet/send` | POST | ✅ | Send SOL or SPL tokens |
| `/api/v1/wallet/receive` | GET | ✅ | Get deposit address + QR |
| `/api/v1/wallet/transactions` | GET | ✅ | Transaction history |

### Jupiter (Swaps)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/jupiter/tokens` | GET | - | List available tokens |
| `/api/v1/jupiter/quote` | GET | - | Get swap quote |
| `/api/v1/jupiter/swap` | POST | ✅ | Execute token swap |

### Kamino Finance
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/kamino/markets` | GET | - | List lending markets |
| `/api/v1/kamino/reserves` | GET | - | Get reserves with APY |
| `/api/v1/kamino/vaults` | GET | - | List yield vaults |
| `/api/v1/kamino/deposit` | POST | ✅ | Deposit/withdraw |
| `/api/v1/kamino/borrow` | POST | ✅ | Borrow/repay |
| `/api/v1/kamino/positions` | GET | - | User positions |

### Raydium (Liquidity)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/raydium/pools` | GET | - | List pools with APY |
| `/api/v1/raydium/pools/:id` | GET | - | Pool details |
| `/api/v1/raydium/quote` | GET | - | Get swap quote |
| `/api/v1/raydium/swap` | POST | ✅ | Execute swap |
| `/api/v1/raydium/pools/add-liquidity` | POST | ✅ | Add liquidity |
| `/api/v1/raydium/pools/remove-liquidity` | POST | ✅ | Remove liquidity |

### Orders & Alerts
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/orders` | GET/POST/DELETE | ✅ | Limit orders |
| `/api/v1/alerts` | GET/POST/DELETE | ✅ | Price alerts |

---

## 🔒 Security Model

1. **Embedded Wallets** — Each agent gets a unique Privy embedded wallet
2. **No Shared Keys** — Private keys never leave Privy's secure enclave
3. **Human Override** — Claim system allows humans to take control
4. **API Key Auth** — Rate-limited API access per agent
5. **Audit Logging** — Every transaction logged for review

---

## 🎮 Use Case Examples

### Autonomous Trading Bot
```python
# Agent detects opportunity and executes
quote = solskill.jupiter_quote(input="SOL", output="USDC", amount=10)
solskill.jupiter_swap(quote)
```

### Yield Optimization
```python
# Agent finds best yield and deposits
vaults = solskill.kamino_vaults(token="USDC", minApy=10)
solskill.kamino_deposit(vault=vaults[0], amount=1000)
```

### Portfolio Rebalancing
```python
# Agent maintains 50/50 allocation
positions = solskill.kamino_positions()
if positions["SOL"] > positions["USDC"]:
    solskill.jupiter_swap(input="SOL", output="USDC", amount=excess)
```

---

## 🌐 Links

| Resource | URL |
|----------|-----|
| **Live Demo** | [https://solskill.ai](https://solskill.ai) |
| **Skill Spec** | [https://solskill.ai/skill.md](https://solskill.ai/skill.md) |
| **Dashboard** | [https://solskill.ai/dashboard](https://solskill.ai/dashboard) |

---

## 🏆 Hackathon

Built for **Solana AI Hackathon** — demonstrating how autonomous AI agents can safely participate in DeFi with proper custody and human oversight.

See [HACKATHON.md](./HACKATHON.md) for submission details.

---

<p align="center">
  <strong>🛠️ SolSkill — Because your AI deserves a wallet too.</strong>
</p>
